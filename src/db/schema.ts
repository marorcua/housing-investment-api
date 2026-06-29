import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const properties = sqliteTable('properties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address'),
  purchasePrice: integer('purchase_price').notNull(), // cents
  purchaseDate: text('purchase_date').notNull(),
  cadastralValue: integer('cadastral_value'), // cents
  buildingValue: integer('building_value'), // cents — Used for 3% amortization
});

export const revenues = sqliteTable('revenues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // cents
  date: text('date').notNull(),
  description: text('description'),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(), // cents
  type: text('type').notNull(), // 'interest', 'tax', 'community', 'insurance', 'repair', 'other'
  date: text('date').notNull(),
  description: text('description'),
});

export const tenants = sqliteTable('tenants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'), // null if current/ongoing
  monthlyRent: integer('monthly_rent').notNull(), // cents
});

export const loans = sqliteTable('loans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  principal: integer('principal').notNull(), // cents
  interestRate: real('interest_rate').notNull(),
  termYears: integer('term_years').notNull(),
  startDate: text('start_date').notNull(),
  actualPayment: integer('actual_payment'), // cents — override monthly payment from bank statement
});

export const rentIncreases = sqliteTable('rent_increases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  yearOffset: integer('year_offset').notNull(),
  percentage: real('percentage').notNull(), // e.g. 2.5 for 2.5%
  applied: integer('applied').notNull().default(0), // 0 = pending, 1 = granted
});

export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(), // 'insurance_housing', 'insurance_life', 'tax_ibi', 'community', 'other'
  amount: integer('amount').notNull(), // cents (0 when percentage is used)
  percentage: real('percentage'), // e.g. 8 for 8% of rental income (null = fixed amount)
  frequency: text('frequency').notNull(), // 'monthly', 'annual'
  startDate: text('start_date').notNull(),
});

