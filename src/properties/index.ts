import { PropertyService } from './application/services/PropertyService.js';
import { DrizzlePropertyRepository } from './infrastructure/repositories/DrizzlePropertyRepository.js';
import { createPropertiesRoutes } from './application/routes/properties.js';

export function createPropertiesModule() {
  return createPropertiesRoutes(new PropertyService(new DrizzlePropertyRepository()));
}
