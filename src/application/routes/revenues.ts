import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../infrastructure/db/index.js';
import { revenues } from '../../infrastructure/db/schema.js';
import { eq } from 'drizzle-orm';
import { eurosToCents, centsToEuros } from '../../domain/money.js';

const revenuesRoute = new Hono();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const revenueSchema = z.object({
  propertyId: z.number().int(),
  amount: z.number().positive(),
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  description: z.string().optional(),
});

const formatRevenue = (r: typeof revenues.$inferSelect) => ({ ...r, amount: centsToEuros(r.amount) });

revenuesRoute.get('/property/:propertyId', async (c) => {
  const propertyId = parseInt(c.req.param('propertyId'));
  const res = await db.select().from(revenues).where(eq(revenues.propertyId, propertyId));
  return c.json(res.map(formatRevenue));
});

revenuesRoute.post('/', zValidator('json', revenueSchema), async (c) => {
  const data = c.req.valid('json');
  const result = await db.insert(revenues).values({ ...data, amount: eurosToCents(data.amount) }).returning();
  return c.json(formatRevenue(result[0]), 201);
});

revenuesRoute.patch('/:id', zValidator('json', revenueSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const dbData: Record<string, unknown> = { ...data };
  if (data.amount !== undefined) dbData.amount = eurosToCents(data.amount);
  const result = await db.update(revenues).set(dbData).where(eq(revenues.id, id)).returning();
  if (result.length === 0) return c.json({ error: 'Revenue not found' }, 404);
  return c.json(formatRevenue(result[0]));
});

revenuesRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const result = await db.delete(revenues).where(eq(revenues.id, id)).returning();
  if (result.length === 0) return c.json({ error: 'Revenue not found' }, 404);
  return c.json({ message: 'Revenue deleted' });
});

export default revenuesRoute;
