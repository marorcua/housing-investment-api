import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { RecurringExpenseService } from '../services/RecurringExpenseService.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const createSchema = z.object({
  propertyId: z.number().int(),
  name: z.string().min(1),
  type: z.enum(['insurance_housing', 'insurance_life', 'tax_ibi', 'community', 'other']),
  amount: z.number().nonnegative().optional().default(0),
  percentage: z.number().positive().optional(),
  frequency: z.enum(['monthly', 'annual']),
  startDate: z.string().regex(dateRegex),
}).refine(d => (d.amount ?? 0) > 0 || (d.percentage ?? 0) > 0, {
  message: 'Either amount or percentage must be provided',
});

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  type: z.enum(['insurance_housing', 'insurance_life', 'tax_ibi', 'community', 'other']).optional(),
  amount: z.number().nonnegative().optional(),
  percentage: z.number().positive().optional().nullable(),
  frequency: z.enum(['monthly', 'annual']).optional(),
  startDate: z.string().regex(dateRegex).optional(),
});

export function createRecurringExpensesRoutes(service: RecurringExpenseService): Hono {
  const router = new Hono();

  router.get('/property/:propertyId', async (c) => {
    const items = await service.listByProperty(parseInt(c.req.param('propertyId')));
    return c.json(items.map(formatItem));
  });

  router.post('/', zValidator('json', createSchema), async (c) => {
    const data = c.req.valid('json');
    const item = await service.create({
      propertyId: data.propertyId,
      name: data.name,
      type: data.type,
      amount: data.amount && data.amount > 0 ? Money.fromEuros(data.amount) : undefined,
      percentage: data.percentage,
      frequency: data.frequency,
      startDate: data.startDate,
    });
    return c.json(formatItem(item), 201);
  });

  router.patch('/:id', zValidator('json', updateSchema), async (c) => {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.type !== undefined) update.type = data.type;
    if (data.amount !== undefined) update.amount = Money.fromEuros(data.amount);
    if (data.percentage !== undefined) update.percentage = data.percentage;
    if (data.frequency !== undefined) update.frequency = data.frequency;
    if (data.startDate !== undefined) update.startDate = data.startDate;
    const item = await service.update(id, update as any);
    if (!item) return c.json({ error: 'Recurring expense not found' }, 404);
    return c.json(formatItem(item));
  });

  router.delete('/:id', async (c) => {
    const ok = await service.delete(parseInt(c.req.param('id')));
    if (!ok) return c.json({ error: 'Recurring expense not found' }, 404);
    return c.json({ message: 'Recurring expense deleted' });
  });

  return router;
}

function formatItem(r: import('../../domain/entities/RecurringExpense.js').RecurringExpense) {
  return {
    id: r.id,
    propertyId: r.propertyId,
    name: r.name,
    type: r.type,
    amount: r.amount.toEuros(),
    percentage: r.percentage,
    frequency: r.frequency,
    startDate: r.startDate,
  };
}
