import { describe, it, expect } from 'vitest';
import { Money } from '../../src/shared/domain/valueObjects/Money.js';

describe('Money.fromEuros', () => {
  it('converts whole euros to cents', () => {
    expect(Money.fromEuros(100).toCents()).toBe(10000);
  });

  it('converts decimal euros to cents', () => {
    expect(Money.fromEuros(99.99).toCents()).toBe(9999);
  });

  it('rounds to nearest cent', () => {
    expect(Money.fromEuros(10.345).toCents()).toBe(1035);
    expect(Money.fromEuros(10.344).toCents()).toBe(1034);
  });

  it('handles zero', () => {
    expect(Money.fromEuros(0).toCents()).toBe(0);
  });

  it('handles negative values', () => {
    expect(Money.fromEuros(-50.5).toCents()).toBe(-5050);
  });

  it('handles large values', () => {
    expect(Money.fromEuros(1_000_000).toCents()).toBe(100_000_000);
  });

  it('handles single cent euro values', () => {
    expect(Money.fromEuros(0.01).toCents()).toBe(1);
    expect(Money.fromEuros(0.99).toCents()).toBe(99);
  });
});

describe('Money.fromCents', () => {
  it('converts cents to whole euros', () => {
    expect(Money.fromCents(10000).toEuros()).toBe(100);
  });

  it('converts cents to decimal euros', () => {
    expect(Money.fromCents(9999).toEuros()).toBe(99.99);
  });

  it('handles zero', () => {
    expect(Money.fromCents(0).toEuros()).toBe(0);
  });

  it('handles negative values', () => {
    expect(Money.fromCents(-5050).toEuros()).toBe(-50.5);
  });

  it('rounds to 2 decimal places', () => {
    expect(Money.fromCents(1).toEuros()).toBe(0.01);
    expect(Money.fromCents(123).toEuros()).toBe(1.23);
  });

  it('is inverse of fromEuros', () => {
    const original = [0, 1, 100, 99.99, 0.01, 1000000, -50.5];
    for (const val of original) {
      expect(Money.fromCents(Money.fromEuros(val).toCents()).toEuros()).toBeCloseTo(val, 2);
    }
  });
});
