import { eq } from 'drizzle-orm';
import { db } from '../../../shared/infrastructure/db/index.js';
import { recurringExpenses } from '../../../shared/infrastructure/db/schema.js';
import { RecurringExpense } from '../../domain/entities/RecurringExpense.js';
import { RecurringExpenseRepository, RecurringExpenseCreateInput } from '../../domain/ports/RecurringExpenseRepository.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class DrizzleRecurringExpenseRepository implements RecurringExpenseRepository {
  async findByPropertyId(propertyId: number): Promise<RecurringExpense[]> {
    const rows = await db.select().from(recurringExpenses).where(eq(recurringExpenses.propertyId, propertyId));
    return rows.map(toDomain);
  }

  async create(input: RecurringExpenseCreateInput): Promise<RecurringExpense> {
    const [row] = await db.insert(recurringExpenses).values({
      propertyId: input.propertyId,
      name: input.name,
      type: input.type,
      amount: input.amount?.toCents() ?? 0,
      percentage: input.percentage ?? null,
      frequency: input.frequency,
      startDate: input.startDate,
    }).returning();
    return toDomain(row);
  }

  async update(id: number, input: Partial<RecurringExpenseCreateInput>): Promise<RecurringExpense | null> {
    const dbData: Record<string, unknown> = {};
    if (input.name !== undefined) dbData.name = input.name;
    if (input.type !== undefined) dbData.type = input.type;
    if (input.amount !== undefined) dbData.amount = input.amount.toCents();
    if (input.percentage !== undefined) dbData.percentage = input.percentage;
    if (input.frequency !== undefined) dbData.frequency = input.frequency;
    if (input.startDate !== undefined) dbData.startDate = input.startDate;
    const [row] = await db.update(recurringExpenses).set(dbData).where(eq(recurringExpenses.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const [row] = await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id)).returning();
    return !!row;
  }
}

function toDomain(row: typeof recurringExpenses.$inferSelect): RecurringExpense {
  return new RecurringExpense(
    row.id,
    row.propertyId,
    row.name,
    row.type,
    Money.fromCents(row.amount),
    row.percentage,
    row.frequency,
    row.startDate,
  );
}
