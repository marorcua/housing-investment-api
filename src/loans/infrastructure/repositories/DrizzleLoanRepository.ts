import { eq } from 'drizzle-orm';
import { db } from '../../../shared/infrastructure/db/index.js';
import { loans } from '../../../shared/infrastructure/db/schema.js';
import { Loan } from '../../domain/entities/Loan.js';
import { LoanRepository, LoanCreateInput } from '../../domain/ports/LoanRepository.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class DrizzleLoanRepository implements LoanRepository {
  async findByPropertyId(propertyId: number): Promise<Loan[]> {
    const rows = await db.select().from(loans).where(eq(loans.propertyId, propertyId));
    return rows.map(toDomain);
  }

  async findById(id: number): Promise<Loan | null> {
    const [row] = await db.select().from(loans).where(eq(loans.id, id));
    return row ? toDomain(row) : null;
  }

  async create(input: LoanCreateInput): Promise<Loan> {
    const [row] = await db.insert(loans).values({
      propertyId: input.propertyId,
      name: input.name,
      principal: input.principal.toCents(),
      interestRate: input.interestRate,
      termYears: input.termYears,
      startDate: input.startDate,
      actualPayment: input.actualPayment?.toCents() ?? null,
    }).returning();
    return toDomain(row);
  }

  async update(id: number, input: Partial<LoanCreateInput>): Promise<Loan | null> {
    const dbData: Record<string, unknown> = {};
    if (input.propertyId !== undefined) dbData.propertyId = input.propertyId;
    if (input.name !== undefined) dbData.name = input.name;
    if (input.principal !== undefined) dbData.principal = input.principal.toCents();
    if (input.interestRate !== undefined) dbData.interestRate = input.interestRate;
    if (input.termYears !== undefined) dbData.termYears = input.termYears;
    if (input.startDate !== undefined) dbData.startDate = input.startDate;
    if (input.actualPayment !== undefined) dbData.actualPayment = input.actualPayment?.toCents() ?? null;
    const [row] = await db.update(loans).set(dbData).where(eq(loans.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const [row] = await db.delete(loans).where(eq(loans.id, id)).returning();
    return !!row;
  }
}

function toDomain(row: typeof loans.$inferSelect): Loan {
  return new Loan(
    row.id,
    row.propertyId,
    row.name,
    Money.fromCents(row.principal),
    row.interestRate,
    row.termYears,
    row.startDate,
    row.actualPayment !== null ? Money.fromCents(row.actualPayment) : null,
  );
}
