import { eq } from 'drizzle-orm';
import { db } from '../../../shared/infrastructure/db/index.js';
import { revenues } from '../../../shared/infrastructure/db/schema.js';
import { Revenue } from '../../domain/entities/Revenue.js';
import { RevenueRepository, RevenueCreateInput } from '../../domain/ports/RevenueRepository.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class DrizzleRevenueRepository implements RevenueRepository {
  async findByPropertyId(propertyId: number): Promise<Revenue[]> {
    const rows = await db.select().from(revenues).where(eq(revenues.propertyId, propertyId));
    return rows.map(toDomain);
  }

  async create(input: RevenueCreateInput): Promise<Revenue> {
    const [row] = await db.insert(revenues).values({
      propertyId: input.propertyId,
      amount: input.amount.toCents(),
      date: input.date,
      description: input.description ?? null,
    }).returning();
    return toDomain(row);
  }

  async update(id: number, input: Partial<RevenueCreateInput>): Promise<Revenue | null> {
    const dbData: Record<string, unknown> = {};
    if (input.amount !== undefined) dbData.amount = input.amount.toCents();
    if (input.date !== undefined) dbData.date = input.date;
    if (input.description !== undefined) dbData.description = input.description;
    const [row] = await db.update(revenues).set(dbData).where(eq(revenues.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const [row] = await db.delete(revenues).where(eq(revenues.id, id)).returning();
    return !!row;
  }
}

function toDomain(row: typeof revenues.$inferSelect): Revenue {
  return new Revenue(
    row.id, row.propertyId, Money.fromCents(row.amount),
    row.date, row.description,
  );
}
