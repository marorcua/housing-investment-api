import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { db } from '../../infrastructure/db/index.js';
import { loans } from '../../infrastructure/db/schema.js';
import { eq } from 'drizzle-orm';
import { eurosToCents, centsToEuros } from '../../domain/money.js';

const loansRoute = new Hono();

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const loanSchema = z.object({
  propertyId: z.number().int(),
  name: z.string().min(1),
  principal: z.number().positive(),
  interestRate: z.number().nonnegative(),
  termYears: z.number().int().positive(),
  startDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  actualPayment: z.number().positive().optional().nullable(),
});

const formatLoan = (l: typeof loans.$inferSelect) => ({
  id: l.id,
  propertyId: l.propertyId,
  name: l.name,
  principal: centsToEuros(l.principal),
  interestRate: l.interestRate,
  termYears: l.termYears,
  startDate: l.startDate,
  actualPayment: l.actualPayment ? centsToEuros(l.actualPayment) : undefined,
});

// GET all loans for a property
loansRoute.get('/property/:propertyId', async (c) => {
  const propertyId = parseInt(c.req.param('propertyId'));
  const res = await db.select().from(loans).where(eq(loans.propertyId, propertyId));
  return c.json(res.map(formatLoan));
});

// POST create loan
loansRoute.post('/', zValidator('json', loanSchema), async (c) => {
  const data = c.req.valid('json');
  const result = await db.insert(loans).values({
    ...data,
    principal: eurosToCents(data.principal),
    actualPayment: data.actualPayment ? eurosToCents(data.actualPayment) : null,
  }).returning();
  return c.json(formatLoan(result[0]), 201);
});

// PATCH update loan
loansRoute.patch('/:id', zValidator('json', loanSchema.partial()), async (c) => {
  const id = parseInt(c.req.param('id'));
  const data = c.req.valid('json');
  const dbData: Record<string, unknown> = {};
  if (data.name !== undefined) dbData.name = data.name;
  if (data.principal !== undefined) dbData.principal = eurosToCents(data.principal);
  if (data.interestRate !== undefined) dbData.interestRate = data.interestRate;
  if (data.termYears !== undefined) dbData.termYears = data.termYears;
  if (data.startDate !== undefined) dbData.startDate = data.startDate;
  if (data.actualPayment !== undefined) dbData.actualPayment = data.actualPayment ? eurosToCents(data.actualPayment) : null;
  const result = await db.update(loans).set(dbData).where(eq(loans.id, id)).returning();
  
  if (result.length === 0) return c.json({ error: 'Loan not found' }, 404);
  return c.json(formatLoan(result[0]));
});

// DELETE loan
loansRoute.delete('/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const result = await db.delete(loans).where(eq(loans.id, id)).returning();
  
  if (result.length === 0) return c.json({ error: 'Loan not found' }, 404);
  return c.json({ message: 'Loan deleted' });
});

export default loansRoute;
