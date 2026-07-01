import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { RevenueService } from '../services/RevenueService.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const revenueSchema = z.object({
  propertyId: z.number().int(),
  amount: z.number().positive(),
  date: z.string().regex(dateRegex),
  description: z.string().optional(),
});

export function createRevenuesRoutes(service: RevenueService): Hono {
  const router = new Hono();

  router.get('/property/:propertyId', async (c) => {
    const revenues = await service.listByProperty(parseInt(c.req.param('propertyId')));
    return c.json(revenues.map(formatRevenue));
  });

  router.post('/', zValidator('json', revenueSchema), async (c) => {
    const data = c.req.valid('json');
    const revenue = await service.create({
      propertyId: data.propertyId,
      amount: Money.fromEuros(data.amount),
      date: data.date,
      description: data.description,
    });
    return c.json(formatRevenue(revenue), 201);
  });

  router.patch('/:id', zValidator('json', revenueSchema.partial()), async (c) => {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    const update: Record<string, unknown> = {};
    if (data.amount !== undefined) update.amount = Money.fromEuros(data.amount);
    if (data.date !== undefined) update.date = data.date;
    if (data.description !== undefined) update.description = data.description;
    const revenue = await service.update(id, update as any);
    if (!revenue) return c.json({ error: 'Revenue not found' }, 404);
    return c.json(formatRevenue(revenue));
  });

  router.delete('/:id', async (c) => {
    const ok = await service.delete(parseInt(c.req.param('id')));
    if (!ok) return c.json({ error: 'Revenue not found' }, 404);
    return c.json({ message: 'Revenue deleted' });
  });

  return router;
}

function formatRevenue(r: import('../../domain/entities/Revenue.js').Revenue) {
  return {
    id: r.id, propertyId: r.propertyId,
    amount: r.amount.toEuros(), date: r.date, description: r.description,
  };
}
