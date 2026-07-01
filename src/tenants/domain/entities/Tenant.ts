import { Money } from '../../../shared/domain/valueObjects/Money.js';

export interface RentIncreaseInfo {
  id: number;
  yearOffset: number;
  percentage: number;
  applied: boolean;
}

export class Tenant {
  constructor(
    public readonly id: number,
    public readonly propertyId: number,
    public readonly name: string,
    public readonly startDate: string,
    public readonly endDate: string | null,
    public readonly monthlyRent: Money,
    public readonly rentIncreases: RentIncreaseInfo[],
  ) {}
}
