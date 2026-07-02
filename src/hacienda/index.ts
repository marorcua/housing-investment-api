import { HaciendaService } from './application/services/HaciendaService.js';
import { DrizzleHaciendaQuery } from './infrastructure/repositories/DrizzleHaciendaQuery.js';
import { createHaciendaRoutes } from './application/routes/hacienda.js';
import { createGlobalHaciendaRoutes } from './application/routes/global-hacienda.js';

export function createHaciendaModules() {
  const service = new HaciendaService(new DrizzleHaciendaQuery());
  return {
    hacienda: createHaciendaRoutes(service),
    globalHacienda: createGlobalHaciendaRoutes(service),
  };
}
