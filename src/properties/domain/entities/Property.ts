import { Money } from '../../../shared/domain/valueObjects/Money.js';

export class Property {
  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly address: string | null,
    public readonly purchasePrice: Money,
    public readonly purchaseDate: string,
    public readonly cadastralValue: Money | null,
    public readonly buildingValue: Money | null,
  ) {}

  get buildingValuePercentage(): number {
    if (!this.buildingValue || !this.cadastralValue || this.cadastralValue.isZero()) return 0.8;
    return this.buildingValue.toCents() / this.cadastralValue.toCents();
  }
}
