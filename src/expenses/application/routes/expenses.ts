import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { ExpenseService } from '../services/ExpenseService.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const expenseSchema = z.object({
  propertyId: z.number().int(),
  amount: z.number().positive(),
  type: z.enum(['interest', 'tax', 'community', 'insurance', 'repair', 'other']),
  date: z.string().regex(dateRegex),
  description: z.string().optional(),
});

export function createExpensesRoutes(service: ExpenseService): Hono {
  const router = new Hono();

  router.get('/property/:propertyId', async (c) => {
    const expenses = await service.listByProperty(parseInt(c.req.param('propertyId')));
    return c.json(expenses.map(formatExpense));
  });

  router.post('/', zValidator('json', expenseSchema), async (c) => {
    const data = c.req.valid('json');
    const expense = await service.create({
      propertyId: data.propertyId,
      amount: Money.fromEuros(data.amount),
      type: data.type,
      date: data.date,
      description: data.description,
    });
    return c.json(formatExpense(expense), 201);
  });

  router.patch('/:id', zValidator('json', expenseSchema.partial()), async (c) => {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    const update: Record<string, unknown> = {};
    if (data.amount !== undefined) update.amount = Money.fromEuros(data.amount);
    if (data.type !== undefined) update.type = data.type;
    if (data.date !== undefined) update.date = data.date;
    if (data.description !== undefined) update.description = data.description;
    const expense = await service.update(id, update as any);
    if (!expense) return c.json({ error: 'Expense not found' }, 404);
    return c.json(formatExpense(expense));
  });

  router.delete('/:id', async (c) => {
    const ok = await service.delete(parseInt(c.req.param('id')));
    if (!ok) return c.json({ error: 'Expense not found' }, 404);
    return c.json({ message: 'Expense deleted' });
  });

  return router;
}

function formatExpense(e: import('../../domain/entities/Expense.js').Expense) {
  return {
    id: e.id,
    propertyId: e.propertyId,
    amount: e.amount.toEuros(),
    type: e.type,
    date: e.date,
    description: e.description,
  };
}
