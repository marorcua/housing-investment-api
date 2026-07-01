import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { PropertyService } from '../services/PropertyService.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const propertySchema = z.object({
  name: z.string().min(1),
  address: z.string().optional(),
  purchasePrice: z.number().positive(),
  purchaseDate: z.string().regex(dateRegex, 'Date must be YYYY-MM-DD'),
  cadastralValue: z.number().nonnegative().optional(),
  buildingValue: z.number().nonnegative().optional(),
});

export function createPropertiesRoutes(service: PropertyService): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const list = await service.list();
    return c.json(list.map(formatProperty));
  });

  router.get('/:id', async (c) => {
    const id = parseInt(c.req.param('id'));
    const property = await service.get(id);
    if (!property) return c.json({ error: 'Property not found' }, 404);
    return c.json(formatProperty(property));
  });

  router.post('/', zValidator('json', propertySchema), async (c) => {
    const data = c.req.valid('json');
    const property = await service.create({
      name: data.name,
      address: data.address,
      purchasePrice: Money.fromEuros(data.purchasePrice),
      purchaseDate: data.purchaseDate,
      cadastralValue: data.cadastralValue !== undefined ? Money.fromEuros(data.cadastralValue) : undefined,
      buildingValue: data.buildingValue !== undefined ? Money.fromEuros(data.buildingValue) : undefined,
    });
    return c.json(formatProperty(property), 201);
  });

  router.patch('/:id', zValidator('json', propertySchema.partial()), async (c) => {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.address !== undefined) update.address = data.address;
    if (data.purchasePrice !== undefined) update.purchasePrice = Money.fromEuros(data.purchasePrice);
    if (data.purchaseDate !== undefined) update.purchaseDate = data.purchaseDate;
    if (data.cadastralValue !== undefined) update.cadastralValue = Money.fromEuros(data.cadastralValue);
    if (data.buildingValue !== undefined) update.buildingValue = Money.fromEuros(data.buildingValue);
    const property = await service.update(id, update as any);
    if (!property) return c.json({ error: 'Property not found' }, 404);
    return c.json(formatProperty(property));
  });

  router.delete('/:id', async (c) => {
    const ok = await service.delete(parseInt(c.req.param('id')));
    if (!ok) return c.json({ error: 'Property not found' }, 404);
    return c.json({ message: 'Property deleted' });
  });

  return router;
}

function formatProperty(p: import('../../domain/entities/Property.js').Property) {
  return {
    id: p.id,
    name: p.name,
    address: p.address,
    purchasePrice: p.purchasePrice.toEuros(),
    purchaseDate: p.purchaseDate,
    cadastralValue: p.cadastralValue?.toEuros() ?? null,
    buildingValue: p.buildingValue?.toEuros() ?? null,
  };
}
