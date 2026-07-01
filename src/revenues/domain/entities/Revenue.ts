import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class Revenue {
  constructor(
    public readonly id: number,
    public readonly propertyId: number,
    public readonly amount: Money,
    public readonly date: string,
    public readonly description: string | null,
  ) {}
}
