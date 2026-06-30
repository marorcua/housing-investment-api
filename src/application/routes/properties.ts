import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../infrastructure/db/index.js';
import { properties } from '../../infrastructure/db/schema.js';
import { eq } from 'drizzle-orm';
import { eurosToCents, centsToEuros } from '../../domain/money.js';

const propertiesRoute = new Hono();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const propertySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  purchasePrice: z.number().positive(),
  purchaseDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  cadastralValue: z.number().nonnegative().optional(),
  buildingValue: z.number().nonnegative().optional(),
});

const formatProperty = (p: typeof properties.$inferSelect) => ({
  ...p,
  purchasePrice: centsToEuros(p.purchasePrice),
  cadastralValue: p.cadastralValue !== null ? centsToEuros(p.cadastralValue) : null,
  buildingValue: p.buildingValue !== null ? centsToEuros(p.buildingValue) : null,
});

// GET all properties
propertiesRoute.get('/', async (c) => {
  const allProperties = await db.select().from(properties);
  return c.json(allProperties.map(formatProperty));
});

// GET property by id
propertiesRoute.get('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const [property] = await db.select().from(properties).where(eq(properties.id, id));
  
  if (!property) return c.json({ error: 'Property not found' }, 404);
  return c.json(formatProperty(property));
});

// POST create property
propertiesRoute.post('/', zValidator('json', propertySchema), async (c) => {
  const data = c.req.valid('json');
  const dbData = {
    ...data,
    purchasePrice: eurosToCents(data.purchasePrice),
    cadastralValue: data.cadastralValue !== undefined ? eurosToCents(data.cadastralValue) : undefined,
    buildingValue: data.buildingValue !== undefined ? eurosToCents(data.buildingValue) : undefined,
  };
  const result = await db.insert(properties).values(dbData).returning();
  return c.json(formatProperty(result[0]), 201);
});

// PATCH update property
propertiesRoute.patch('/:id', zValidator('json', propertySchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const dbData: Record<string, unknown> = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.address !== undefined) dbData.address = data.address;
  if (data.purchasePrice !== undefined) dbData.purchasePrice = eurosToCents(data.purchasePrice);
  if (data.purchaseDate !== undefined) dbData.purchaseDate = data.purchaseDate;
  if (data.cadastralValue !== undefined) dbData.cadastralValue = eurosToCents(data.cadastralValue);
  if (data.buildingValue !== undefined) dbData.buildingValue = eurosToCents(data.buildingValue);
  const result = await db.update(properties).set(dbData).where(eq(properties.id, id)).returning();
  
  if (result.length === 0) return c.json({ error: 'Property not found' }, 404);
  return c.json(formatProperty(result[0]));
});

// DELETE property
propertiesRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const result = await db.delete(properties).where(eq(properties.id, id)).returning();
  
  if (result.length === 0) return c.json({ error: 'Property not found' }, 404);
  return c.json({ message: 'Property deleted' });
});

export default propertiesRoute;
