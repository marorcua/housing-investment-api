import { Property } from '../entities/Property.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export interface PropertyCreateInput {
  name: string;
  address?: string;
  purchasePrice: Money;
  purchaseDate: string;
  cadastralValue?: Money;
  buildingValue?: Money;
}

export interface PropertyRepository {
  findAll(): Promise<Property[]>;
  findById(id: number): Promise<Property | null>;
  create(input: PropertyCreateInput): Promise<Property>;
  update(id: number, input: Partial<PropertyCreateInput>): Promise<Property | null>;
  delete(id: number): Promise<boolean>;
}
