import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class Loan {
  constructor(
    public readonly id: number,
    public readonly propertyId: number,
    public readonly name: string,
    public readonly principal: Money,
    public readonly interestRate: number,
    public readonly termYears: number,
    public readonly startDate: string,
    public readonly actualPayment: Money | null,
  ) {}

  get monthlyPayment(): number {
    const p = this.principal.toEuros();
    const r = this.interestRate / 100 / 12;
    const n = this.termYears * 12;
    return (p * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  }

  get effectiveMonthlyPayment(): number {
    return this.actualPayment ? this.actualPayment.toEuros() : this.monthlyPayment;
  }
}
