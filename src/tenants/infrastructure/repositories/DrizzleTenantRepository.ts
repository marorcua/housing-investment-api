import { eq } from 'drizzle-orm';
import { db } from '../../../shared/infrastructure/db/index.js';
import { tenants, rentIncreases } from '../../../shared/infrastructure/db/schema.js';
import { Tenant, RentIncreaseInfo } from '../../domain/entities/Tenant.js';
import { TenantRepository, TenantCreateInput, RentIncreaseRepository, RentIncreaseCreateInput } from '../../domain/ports/TenantRepository.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class DrizzleTenantRepository implements TenantRepository {
  async findByPropertyId(propertyId: number): Promise<Tenant[]> {
    const rows = await db.select().from(tenants).where(eq(tenants.propertyId, propertyId));
    return Promise.all(rows.map(toDomain));
  }

  async findById(id: number): Promise<Tenant | null> {
    const [row] = await db.select().from(tenants).where(eq(tenants.id, id));
    return row ? toDomain(row) : null;
  }

  async create(input: TenantCreateInput): Promise<Tenant> {
    const [row] = await db.insert(tenants).values({
      propertyId: input.propertyId,
      name: input.name,
      startDate: input.startDate,
      endDate: input.endDate ?? null,
      monthlyRent: input.monthlyRent.toCents(),
    }).returning();
    return toDomain(row);
  }

  async update(id: number, input: Partial<TenantCreateInput>): Promise<Tenant | null> {
    const dbData: Record<string, unknown> = {};
    if (input.propertyId !== undefined) dbData.propertyId = input.propertyId;
    if (input.name !== undefined) dbData.name = input.name;
    if (input.startDate !== undefined) dbData.startDate = input.startDate;
    if (input.endDate !== undefined) dbData.endDate = input.endDate ?? null;
    if (input.monthlyRent !== undefined) dbData.monthlyRent = input.monthlyRent.toCents();
    const [row] = await db.update(tenants).set(dbData).where(eq(tenants.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const [row] = await db.delete(tenants).where(eq(tenants.id, id)).returning();
    return !!row;
  }
}

export class DrizzleRentIncreaseRepository implements RentIncreaseRepository {
  async findByTenantId(tenantId: number): Promise<RentIncreaseInfo[]> {
    const rows = await db.select().from(rentIncreases).where(eq(rentIncreases.tenantId, tenantId));
    return rows.map(r => ({ id: r.id, yearOffset: r.yearOffset, percentage: r.percentage, applied: !!r.applied }));
  }

  async create(input: RentIncreaseCreateInput): Promise<RentIncreaseInfo> {
    const [row] = await db.insert(rentIncreases).values({
      tenantId: input.tenantId,
      yearOffset: input.yearOffset,
      percentage: input.percentage,
      applied: 0,
    }).returning();
    return { id: row.id, yearOffset: row.yearOffset, percentage: row.percentage, applied: !!row.applied };
  }

  async update(id: number, input: any): Promise<RentIncreaseInfo | null> {
    const dbData: Record<string, unknown> = {};
    if (input.yearOffset !== undefined) dbData.yearOffset = input.yearOffset;
    if (input.percentage !== undefined) dbData.percentage = input.percentage;
    if (input.applied !== undefined) dbData.applied = input.applied ? 1 : 0;
    const [row] = await db.update(rentIncreases).set(dbData).where(eq(rentIncreases.id, id)).returning();
    return row ? { id: row.id, yearOffset: row.yearOffset, percentage: row.percentage, applied: !!row.applied } : null;
  }

  async delete(id: number): Promise<boolean> {
    const [row] = await db.delete(rentIncreases).where(eq(rentIncreases.id, id)).returning();
    return !!row;
  }
}

async function toDomain(row: typeof tenants.$inferSelect): Promise<Tenant> {
  const increases = await new DrizzleRentIncreaseRepository().findByTenantId(row.id);
  return new Tenant(
    row.id,
    row.propertyId,
    row.name,
    row.startDate,
    row.endDate,
    Money.fromCents(row.monthlyRent),
    increases,
  );
}
