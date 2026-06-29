import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db/index.js';
import { tenants, rentIncreases } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { eurosToCents, centsToEuros } from '../utils/money.js';

const tenantsRoute = new Hono();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const tenantSchema = z.object({
  propertyId: z.number().int(),
  name: z.string().min(1),
  startDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  endDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD').nullable().optional(),
  monthlyRent: z.number().positive(),
});

const formatTenant = (t: typeof tenants.$inferSelect) => ({ ...t, monthlyRent: centsToEuros(t.monthlyRent) });

// GET all tenants for a property (includes rent increases)
tenantsRoute.get('/property/:propertyId', async (c) => {
  const propertyId = parseInt(c.req.param('propertyId'));
  const res = await db.select().from(tenants).where(eq(tenants.propertyId, propertyId));
  const increaseMap = new Map<number, typeof rentIncreases.$inferSelect[]>();
  for (const t of res) {
    const incs = await db.select().from(rentIncreases).where(eq(rentIncreases.tenantId, t.id));
    increaseMap.set(t.id, incs);
  }
  return c.json(res.map(t => ({
    ...formatTenant(t),
    rentIncreases: (increaseMap.get(t.id) || []).map(inc => ({
      id: inc.id,
      yearOffset: inc.yearOffset,
      percentage: inc.percentage,
      applied: !!inc.applied,
    })),
  })));
});

// POST create tenant
tenantsRoute.post('/', zValidator('json', tenantSchema), async (c) => {
  const data = c.req.valid('json');
  const result = await db.insert(tenants).values({ ...data, monthlyRent: eurosToCents(data.monthlyRent) }).returning();
  return c.json(formatTenant(result[0]), 201);
});

// PATCH update tenant
tenantsRoute.patch('/:id', zValidator('json', tenantSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const dbData: Record<string, unknown> = { ...data };
  if (data.monthlyRent !== undefined) dbData.monthlyRent = eurosToCents(data.monthlyRent);
  const result = await db.update(tenants).set(dbData).where(eq(tenants.id, id)).returning();
  
  if (result.length === 0) return c.json({ error: 'Tenant not found' }, 404);
  return c.json(formatTenant(result[0]));
});

// DELETE tenant
tenantsRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const result = await db.delete(tenants).where(eq(tenants.id, id)).returning();
  
  if (result.length === 0) return c.json({ error: 'Tenant not found' }, 404);
  return c.json({ message: 'Tenant deleted' });
});

// --- Rent Increase sub-routes ---

const increaseSchema = z.object({
  yearOffset: z.number().int().positive(),
  percentage: z.number().min(0),
  applied: z.boolean().optional(),
});

// GET all increases for a tenant
tenantsRoute.get('/:tenantId/increases', async (c) => {
  const tenantId = parseInt(c.req.param('tenantId'));
  const res = await db.select().from(rentIncreases).where(eq(rentIncreases.tenantId, tenantId));
  return c.json(res.map(inc => ({
    id: inc.id,
    tenantId: inc.tenantId,
    yearOffset: inc.yearOffset,
    percentage: inc.percentage,
    applied: !!inc.applied,
  })));
});

// POST create a rent increase
tenantsRoute.post('/:tenantId/increases', zValidator('json', increaseSchema), async (c) => {
  const tenantId = parseInt(c.req.param('tenantId'));
  const data = c.req.valid('json');
  const existing = await db.select().from(rentIncreases)
    .where(and(eq(rentIncreases.tenantId, tenantId), eq(rentIncreases.yearOffset, data.yearOffset)));
  if (existing.length > 0) return c.json({ error: 'An increase for this year already exists' }, 409);
  const result = await db.insert(rentIncreases).values({
    tenantId,
    yearOffset: data.yearOffset,
    percentage: data.percentage,
    applied: data.applied ? 1 : 0,
  }).returning();
  return c.json({
    id: result[0].id,
    tenantId: result[0].tenantId,
    yearOffset: result[0].yearOffset,
    percentage: result[0].percentage,
    applied: !!result[0].applied,
  }, 201);
});

// PATCH update a rent increase
tenantsRoute.patch('/:tenantId/increases/:increaseId', zValidator('json', increaseSchema.partial()), async (c) => {
  const increaseId = parseInt(c.req.param('increaseId'));
  const data = c.req.valid('json');
  const dbData: Record<string, unknown> = {};
  if (data.yearOffset !== undefined) dbData.yearOffset = data.yearOffset;
  if (data.percentage !== undefined) dbData.percentage = data.percentage;
  if (data.applied !== undefined) dbData.applied = data.applied ? 1 : 0;
  const result = await db.update(rentIncreases).set(dbData).where(eq(rentIncreases.id, increaseId)).returning();
  if (result.length === 0) return c.json({ error: 'Rent increase not found' }, 404);
  return c.json({
    id: result[0].id,
    tenantId: result[0].tenantId,
    yearOffset: result[0].yearOffset,
    percentage: result[0].percentage,
    applied: !!result[0].applied,
  });
});

// DELETE a rent increase
tenantsRoute.delete('/:tenantId/increases/:increaseId', async (c) => {
  const increaseId = parseInt(c.req.param('increaseId'));
  const result = await db.delete(rentIncreases).where(eq(rentIncreases.id, increaseId)).returning();
  if (result.length === 0) return c.json({ error: 'Rent increase not found' }, 404);
  return c.json({ message: 'Rent increase deleted' });
});

export default tenantsRoute;
