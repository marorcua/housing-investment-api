import { Hono } from 'hono';
import { HaciendaService } from '../services/HaciendaService.js';

export function createGlobalHaciendaRoutes(service: HaciendaService): Hono {
  const router = new Hono();

  router.get('/', async (c) => {
    const year = c.req.query('year');
    const data = await service.getGlobal(year);
    return c.json(data);
  });

  return router;
}
