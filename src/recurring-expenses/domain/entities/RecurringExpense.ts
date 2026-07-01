import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class RecurringExpense {
  constructor(
    public readonly id: number,
    public readonly propertyId: number,
    public readonly name: string,
    public readonly type: string,
    public readonly amount: Money,
    public readonly percentage: number | null,
    public readonly frequency: string,
    public readonly startDate: string,
  ) {}

  monthlyAmount(monthlyRent: Money): Money {
    if (this.percentage) {
      return monthlyRent.multiply(this.percentage / 100);
    }
    return this.amount;
  }
}
