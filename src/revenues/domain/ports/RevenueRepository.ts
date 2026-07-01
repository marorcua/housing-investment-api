import { Revenue } from '../entities/Revenue.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export interface RevenueCreateInput {
  propertyId: number;
  amount: Money;
  date: string;
  description?: string;
}

export interface RevenueRepository {
  findByPropertyId(propertyId: number): Promise<Revenue[]>;
  create(input: RevenueCreateInput): Promise<Revenue>;
  update(id: number, input: Partial<RevenueCreateInput>): Promise<Revenue | null>;
  delete(id: number): Promise<boolean>;
}
