import { Tenant, RentIncreaseInfo } from '../entities/Tenant.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export interface TenantCreateInput {
  propertyId: number;
  name: string;
  startDate: string;
  endDate?: string;
  monthlyRent: Money;
}

export interface TenantRepository {
  findByPropertyId(propertyId: number): Promise<Tenant[]>;
  findById(id: number): Promise<Tenant | null>;
  create(input: TenantCreateInput): Promise<Tenant>;
  update(id: number, input: Partial<TenantCreateInput>): Promise<Tenant | null>;
  delete(id: number): Promise<boolean>;
}

export interface RentIncreaseCreateInput {
  tenantId: number;
  yearOffset: number;
  percentage: number;
}

export interface RentIncreaseRepository {
  findByTenantId(tenantId: number): Promise<RentIncreaseInfo[]>;
  create(input: RentIncreaseCreateInput): Promise<RentIncreaseInfo>;
  update(id: number, input: Partial<RentIncreaseCreateInput & { applied: boolean }>): Promise<RentIncreaseInfo | null>;
  delete(id: number): Promise<boolean>;
}
