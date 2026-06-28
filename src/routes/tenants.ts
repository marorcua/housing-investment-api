import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db/index.js';
import { tenants } from '../db/schema.js';
import { eq } from 'drizzle-orm';
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

// GET all tenants for a property
tenantsRoute.get('/property/:propertyId', async (c) => {
  const propertyId = parseInt(c.req.param('propertyId'));
  const res = await db.select().from(tenants).where(eq(tenants.propertyId, propertyId));
  return c.json(res.map(formatTenant));
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

export default tenantsRoute;
