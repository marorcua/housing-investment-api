export class Money {
  private constructor(private readonly cents: number) {}

  static fromEuros(amount: number): Money {
    return new Money(Math.round(amount * 100));
  }

  static fromCents(cents: number): Money {
    return new Money(cents);
  }

  static zero(): Money {
    return new Money(0);
  }

  toEuros(): number {
    return this.cents / 100;
  }

  toCents(): number {
    return this.cents;
  }

  add(other: Money): Money {
    return new Money(this.cents + other.cents);
  }

  subtract(other: Money): Money {
    return new Money(this.cents - other.cents);
  }

  multiply(factor: number): Money {
    return new Money(Math.round(this.cents * factor));
  }

  isGreaterThan(other: Money): boolean {
    return this.cents > other.cents;
  }

  isZero(): boolean {
    return this.cents === 0;
  }

  equals(other: Money): boolean {
    return this.cents === other.cents;
  }
}
