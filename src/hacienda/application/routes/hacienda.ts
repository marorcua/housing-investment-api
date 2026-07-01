import { Hono } from 'hono';
import { HaciendaService } from '../services/HaciendaService.js';

export function createHaciendaRoutes(service: HaciendaService): Hono {
  const router = new Hono();

  router.get('/summary/:propertyId', async (c) => {
    const propertyId = parseInt(c.req.param('propertyId'));
    const year = c.req.query('year');
    try {
      const summary = await service.getSummary(propertyId, year);
      return c.json(summary);
    } catch (e: any) {
      if (e.message === 'Property not found') return c.json({ error: 'Property not found' }, 404);
      throw e;
    }
  });

  return router;
}
