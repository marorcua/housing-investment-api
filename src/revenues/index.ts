import { RevenueService } from './application/services/RevenueService.js';
import { DrizzleRevenueRepository } from './infrastructure/repositories/DrizzleRevenueRepository.js';
import { createRevenuesRoutes } from './application/routes/revenues.js';

export function createRevenuesModule() {
  return createRevenuesRoutes(new RevenueService(new DrizzleRevenueRepository()));
}
