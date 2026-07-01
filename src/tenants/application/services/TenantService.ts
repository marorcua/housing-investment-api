import { TenantRepository, TenantCreateInput, RentIncreaseRepository, RentIncreaseCreateInput } from '../../domain/ports/TenantRepository.js';
import { Tenant } from '../../domain/entities/Tenant.js';

export class TenantService {
  constructor(
    private tenantRepo: TenantRepository,
    private increaseRepo: RentIncreaseRepository,
  ) {}

  async listByProperty(propertyId: number): Promise<Tenant[]> { return this.tenantRepo.findByPropertyId(propertyId); }
  async get(id: number): Promise<Tenant | null> { return this.tenantRepo.findById(id); }
  async create(input: TenantCreateInput): Promise<Tenant> { return this.tenantRepo.create(input); }
  async update(id: number, input: Partial<TenantCreateInput>): Promise<Tenant | null> { return this.tenantRepo.update(id, input); }
  async delete(id: number): Promise<boolean> { return this.tenantRepo.delete(id); }

  async listIncreases(tenantId: number) { return this.increaseRepo.findByTenantId(tenantId); }
  async createIncrease(input: RentIncreaseCreateInput) { return this.increaseRepo.create(input); }
  async updateIncrease(id: number, input: any) { return this.increaseRepo.update(id, input); }
  async deleteIncrease(id: number) { return this.increaseRepo.delete(id); }
}
