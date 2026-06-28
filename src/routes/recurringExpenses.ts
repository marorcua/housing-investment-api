import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../db/index.js';
import { recurringExpenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { eurosToCents, centsToEuros } from '../utils/money.js';

const recurringExpensesRoute = new Hono();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const recurringExpenseSchema = z.object({
  propertyId: z.number().int(),
  name: z.string().min(1),
  type: z.enum(['insurance_housing', 'insurance_life', 'tax_ibi', 'community', 'other']),
  amount: z.number().positive(),
  frequency: z.enum(['monthly', 'annual']),
  startDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
});

const formatRecurringExpense = (r: typeof recurringExpenses.$inferSelect) => ({ ...r, amount: centsToEuros(r.amount) });

// GET all recurring expenses for a property
recurringExpensesRoute.get('/property/:propertyId', async (c) => {
  const propertyId = parseInt(c.req.param('propertyId'));
  const res = await db.select().from(recurringExpenses).where(eq(recurringExpenses.propertyId, propertyId));
  return c.json(res.map(formatRecurringExpense));
});

// POST create recurring expense
recurringExpensesRoute.post('/', zValidator('json', recurringExpenseSchema), async (c) => {
  const data = c.req.valid('json');
  const result = await db.insert(recurringExpenses).values({ ...data, amount: eurosToCents(data.amount) }).returning();
  return c.json(formatRecurringExpense(result[0]), 201);
});

// PATCH update recurring expense
recurringExpensesRoute.patch('/:id', zValidator('json', recurringExpenseSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const dbData: Record<string, unknown> = { ...data };
  if (data.amount !== undefined) dbData.amount = eurosToCents(data.amount);
  const result = await db.update(recurringExpenses).set(dbData).where(eq(recurringExpenses.id, id)).returning();
  
  if (result.length === 0) return c.json({ error: 'Recurring expense not found' }, 404);
  return c.json(formatRecurringExpense(result[0]));
});

// DELETE recurring expense
recurringExpensesRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const result = await db.delete(recurringExpenses).where(eq(recurringExpenses.id, id)).returning();
  
  if (result.length === 0) return c.json({ error: 'Recurring expense not found' }, 404);
  return c.json({ message: 'Recurring expense deleted' });
});

export default recurringExpensesRoute;
