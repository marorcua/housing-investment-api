import { describe, it, expect } from 'vitest';
import { eurosToCents, centsToEuros } from './money.js';

describe('eurosToCents', () => {
  it('converts whole euros to cents', () => {
    expect(eurosToCents(100)).toBe(10000);
  });

  it('converts decimal euros to cents', () => {
    expect(eurosToCents(99.99)).toBe(9999);
  });

  it('rounds to nearest cent', () => {
    expect(eurosToCents(10.345)).toBe(1035);
    expect(eurosToCents(10.344)).toBe(1034);
  });

  it('handles zero', () => {
    expect(eurosToCents(0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(eurosToCents(-50.5)).toBe(-5050);
  });

  it('handles large values', () => {
    expect(eurosToCents(1_000_000)).toBe(100_000_000);
  });

  it('handles single cent euro values', () => {
    expect(eurosToCents(0.01)).toBe(1);
    expect(eurosToCents(0.99)).toBe(99);
  });
});

describe('centsToEuros', () => {
  it('converts cents to whole euros', () => {
    expect(centsToEuros(10000)).toBe(100);
  });

  it('converts cents to decimal euros', () => {
    expect(centsToEuros(9999)).toBe(99.99);
  });

  it('handles zero', () => {
    expect(centsToEuros(0)).toBe(0);
  });

  it('handles negative values', () => {
    expect(centsToEuros(-5050)).toBe(-50.5);
  });

  it('rounds to 2 decimal places', () => {
    expect(centsToEuros(1)).toBe(0.01);
    expect(centsToEuros(123)).toBe(1.23);
  });

  it('is inverse of eurosToCents', () => {
    const original = [0, 1, 100, 99.99, 0.01, 1000000, -50.5];
    for (const val of original) {
      expect(centsToEuros(eurosToCents(val))).toBeCloseTo(val, 2);
    }
  });
});
