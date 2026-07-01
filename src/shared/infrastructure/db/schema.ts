import { sqliteTable, text, integer, real } from 'drizzle-orm/sqlite-core';

export const properties = sqliteTable('properties', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  address: text('address'),
  purchasePrice: integer('purchase_price').notNull(),
  purchaseDate: text('purchase_date').notNull(),
  cadastralValue: integer('cadastral_value'),
  buildingValue: integer('building_value'),
});

export const revenues = sqliteTable('revenues', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  date: text('date').notNull(),
  description: text('description'),
});

export const expenses = sqliteTable('expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  amount: integer('amount').notNull(),
  type: text('type').notNull(),
  date: text('date').notNull(),
  description: text('description'),
});

export const tenants = sqliteTable('tenants', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  startDate: text('start_date').notNull(),
  endDate: text('end_date'),
  monthlyRent: integer('monthly_rent').notNull(),
});

export const loans = sqliteTable('loans', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  principal: integer('principal').notNull(),
  interestRate: real('interest_rate').notNull(),
  termYears: integer('term_years').notNull(),
  startDate: text('start_date').notNull(),
  actualPayment: integer('actual_payment'),
});

export const rentIncreases = sqliteTable('rent_increases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  tenantId: integer('tenant_id').references(() => tenants.id, { onDelete: 'cascade' }).notNull(),
  yearOffset: integer('year_offset').notNull(),
  percentage: real('percentage').notNull(),
  applied: integer('applied').notNull().default(0),
});

export const recurringExpenses = sqliteTable('recurring_expenses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  propertyId: integer('property_id').references(() => properties.id, { onDelete: 'cascade' }).notNull(),
  name: text('name').notNull(),
  type: text('type').notNull(),
  amount: integer('amount').notNull(),
  percentage: real('percentage'),
  frequency: text('frequency').notNull(),
  startDate: text('start_date').notNull(),
});
