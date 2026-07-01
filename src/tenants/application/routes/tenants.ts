import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { TenantService } from '../services/TenantService.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const tenantSchema = z.object({
  propertyId: z.number().int(),
  name: z.string().min(1),
  startDate: z.string().regex(dateRegex),
  endDate: z.string().regex(dateRegex).optional(),
  monthlyRent: z.number().positive(),
});

const increaseSchema = z.object({
  yearOffset: z.number().int().min(0),
  percentage: z.number().positive(),
});

export function createTenantsRoutes(service: TenantService): Hono {
  const router = new Hono();

  router.get('/property/:propertyId', async (c) => {
    const tenants = await service.listByProperty(parseInt(c.req.param('propertyId')));
    return c.json(tenants.map(formatTenant));
  });

  router.get('/:id', async (c) => {
    const tenant = await service.get(parseInt(c.req.param('id')));
    if (!tenant) return c.json({ error: 'Tenant not found' }, 404);
    return c.json(formatTenant(tenant));
  });

  router.post('/', zValidator('json', tenantSchema), async (c) => {
    const data = c.req.valid('json');
    const tenant = await service.create({
      propertyId: data.propertyId,
      name: data.name,
      startDate: data.startDate,
      endDate: data.endDate,
      monthlyRent: Money.fromEuros(data.monthlyRent),
    });
    return c.json(formatTenant(tenant), 201);
  });

  router.patch('/:id', zValidator('json', tenantSchema.partial()), async (c) => {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    const update: Record<string, unknown> = {};
    if (data.propertyId !== undefined) update.propertyId = data.propertyId;
    if (data.name !== undefined) update.name = data.name;
    if (data.startDate !== undefined) update.startDate = data.startDate;
    if (data.endDate !== undefined) update.endDate = data.endDate ?? null;
    if (data.monthlyRent !== undefined) update.monthlyRent = Money.fromEuros(data.monthlyRent);
    const tenant = await service.update(id, update as any);
    if (!tenant) return c.json({ error: 'Tenant not found' }, 404);
    return c.json(formatTenant(tenant));
  });

  router.delete('/:id', async (c) => {
    const ok = await service.delete(parseInt(c.req.param('id')));
    if (!ok) return c.json({ error: 'Tenant not found' }, 404);
    return c.json({ message: 'Tenant deleted' });
  });

  // nested increases
  const incRouter = new Hono();
  incRouter.get('/', async (c) => {
    const increases = await service.listIncreases(parseInt(c.req.param('tenantId')!));
    return c.json(increases.map(formatIncrease));
  });

  incRouter.post('/', zValidator('json', increaseSchema), async (c) => {
    const data = c.req.valid('json');
    try {
      const inc = await service.createIncrease({
        tenantId: parseInt(c.req.param('tenantId')!),
        yearOffset: data.yearOffset,
        percentage: data.percentage,
      });
      return c.json(formatIncrease(inc), 201);
    } catch (e: any) {
      if (e.message?.includes('Duplicate')) return c.json({ error: e.message }, 409);
      throw e;
    }
  });

  incRouter.patch('/:increaseId', zValidator('json', increaseSchema.partial().extend({ applied: z.boolean().optional() })), async (c) => {
    const inc = await service.updateIncrease(parseInt(c.req.param('increaseId')), c.req.valid('json'));
    if (!inc) return c.json({ error: 'Increase not found' }, 404);
    return c.json(formatIncrease(inc));
  });

  incRouter.delete('/:increaseId', async (c) => {
    const ok = await service.deleteIncrease(parseInt(c.req.param('increaseId')));
    if (!ok) return c.json({ error: 'Increase not found' }, 404);
    return c.json({ message: 'Increase deleted' });
  });

  router.route('/:tenantId/increases', incRouter);

  return router;
}

function formatTenant(t: import('../../domain/entities/Tenant.js').Tenant) {
  return {
    id: t.id,
    propertyId: t.propertyId,
    name: t.name,
    startDate: t.startDate,
    endDate: t.endDate,
    monthlyRent: t.monthlyRent.toEuros(),
    rentIncreases: t.rentIncreases.map(formatIncrease),
  };
}

function formatIncrease(i: import('../../domain/entities/Tenant.js').RentIncreaseInfo) {
  return { id: i.id, yearOffset: i.yearOffset, percentage: i.percentage, applied: i.applied };
}
