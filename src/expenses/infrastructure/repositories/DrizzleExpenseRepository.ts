import { eq } from 'drizzle-orm';
import { db } from '../../../shared/infrastructure/db/index.js';
import { expenses } from '../../../shared/infrastructure/db/schema.js';
import { Expense } from '../../domain/entities/Expense.js';
import { ExpenseRepository, ExpenseCreateInput } from '../../domain/ports/ExpenseRepository.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class DrizzleExpenseRepository implements ExpenseRepository {
  async findByPropertyId(propertyId: number): Promise<Expense[]> {
    const rows = await db.select().from(expenses).where(eq(expenses.propertyId, propertyId));
    return rows.map(toDomain);
  }

  async create(input: ExpenseCreateInput): Promise<Expense> {
    const [row] = await db.insert(expenses).values({
      propertyId: input.propertyId,
      amount: input.amount.toCents(),
      type: input.type,
      date: input.date,
      description: input.description ?? null,
    }).returning();
    return toDomain(row);
  }

  async update(id: number, input: Partial<ExpenseCreateInput>): Promise<Expense | null> {
    const dbData: Record<string, unknown> = {};
    if (input.amount !== undefined) dbData.amount = input.amount.toCents();
    if (input.type !== undefined) dbData.type = input.type;
    if (input.date !== undefined) dbData.date = input.date;
    if (input.description !== undefined) dbData.description = input.description;
    const [row] = await db.update(expenses).set(dbData).where(eq(expenses.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const [row] = await db.delete(expenses).where(eq(expenses.id, id)).returning();
    return !!row;
  }
}

function toDomain(row: typeof expenses.$inferSelect): Expense {
  return new Expense(
    row.id, row.propertyId, Money.fromCents(row.amount),
    row.type, row.date, row.description,
  );
}
