import { eq } from 'drizzle-orm';
import { db } from '../../../shared/infrastructure/db/index.js';
import { properties } from '../../../shared/infrastructure/db/schema.js';
import { Property } from '../../domain/entities/Property.js';
import { PropertyRepository, PropertyCreateInput } from '../../domain/ports/PropertyRepository.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class DrizzlePropertyRepository implements PropertyRepository {
  async findAll(): Promise<Property[]> {
    const rows = await db.select().from(properties);
    return rows.map(toDomain);
  }

  async findById(id: number): Promise<Property | null> {
    const [row] = await db.select().from(properties).where(eq(properties.id, id));
    return row ? toDomain(row) : null;
  }

  async create(input: PropertyCreateInput): Promise<Property> {
    const [row] = await db.insert(properties).values({
      name: input.name,
      address: input.address ?? null,
      purchasePrice: input.purchasePrice.toCents(),
      purchaseDate: input.purchaseDate,
      cadastralValue: input.cadastralValue?.toCents() ?? null,
      buildingValue: input.buildingValue?.toCents() ?? null,
    }).returning();
    return toDomain(row);
  }

  async update(id: number, input: Partial<PropertyCreateInput>): Promise<Property | null> {
    const dbData: Record<string, unknown> = {};
    if (input.name !== undefined) dbData.name = input.name;
    if (input.address !== undefined) dbData.address = input.address;
    if (input.purchasePrice !== undefined) dbData.purchasePrice = input.purchasePrice.toCents();
    if (input.purchaseDate !== undefined) dbData.purchaseDate = input.purchaseDate;
    if (input.cadastralValue !== undefined) dbData.cadastralValue = input.cadastralValue?.toCents() ?? null;
    if (input.buildingValue !== undefined) dbData.buildingValue = input.buildingValue?.toCents() ?? null;
    const [row] = await db.update(properties).set(dbData).where(eq(properties.id, id)).returning();
    return row ? toDomain(row) : null;
  }

  async delete(id: number): Promise<boolean> {
    const [row] = await db.delete(properties).where(eq(properties.id, id)).returning();
    return !!row;
  }
}

function toDomain(row: typeof properties.$inferSelect): Property {
  return new Property(
    row.id,
    row.name,
    row.address,
    Money.fromCents(row.purchasePrice),
    row.purchaseDate,
    row.cadastralValue !== null ? Money.fromCents(row.cadastralValue) : null,
    row.buildingValue !== null ? Money.fromCents(row.buildingValue) : null,
  );
}
