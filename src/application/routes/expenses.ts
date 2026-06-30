import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../infrastructure/db/index.js';
import { expenses } from '../../infrastructure/db/schema.js';
import { eq } from 'drizzle-orm';
import { eurosToCents, centsToEuros } from '../../domain/money.js';

const expensesRoute = new Hono();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const expenseSchema = z.object({
  propertyId: z.number().int(),
  amount: z.number().positive(),
  type: z.enum(['interest', 'tax', 'community', 'insurance', 'repair', 'other']),
  date: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  description: z.string().optional(),
});

const formatExpense = (e: typeof expenses.$inferSelect) => ({ ...e, amount: centsToEuros(e.amount) });

expensesRoute.get('/property/:propertyId', async (c) => {
  const propertyId = parseInt(c.req.param('propertyId'));
  const res = await db.select().from(expenses).where(eq(expenses.propertyId, propertyId));
  return c.json(res.map(formatExpense));
});

expensesRoute.post('/', zValidator('json', expenseSchema), async (c) => {
  const data = c.req.valid('json');
  const result = await db.insert(expenses).values({ ...data, amount: eurosToCents(data.amount) }).returning();
  return c.json(formatExpense(result[0]), 201);
});

expensesRoute.patch('/:id', zValidator('json', expenseSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const dbData: Record<string, unknown> = { ...data };
  if (data.amount !== undefined) dbData.amount = eurosToCents(data.amount);
  const result = await db.update(expenses).set(dbData).where(eq(expenses.id, id)).returning();
  if (result.length === 0) return c.json({ error: 'Expense not found' }, 404);
  return c.json(formatExpense(result[0]));
});

expensesRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const result = await db.delete(expenses).where(eq(expenses.id, id)).returning();
  if (result.length === 0) return c.json({ error: 'Expense not found' }, 404);
  return c.json({ message: 'Expense deleted' });
});

export default expensesRoute;
