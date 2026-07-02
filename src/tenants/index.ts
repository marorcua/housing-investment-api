import { TenantService } from './application/services/TenantService.js';
import { DrizzleTenantRepository, DrizzleRentIncreaseRepository } from './infrastructure/repositories/DrizzleTenantRepository.js';
import { createTenantsRoutes } from './application/routes/tenants.js';

export function createTenantsModule() {
  return createTenantsRoutes(new TenantService(new DrizzleTenantRepository(), new DrizzleRentIncreaseRepository()));
}
