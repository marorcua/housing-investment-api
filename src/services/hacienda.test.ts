import { describe, it, expect } from 'vitest';
import {
  calculateAnnualAmortization,
  calculateNetYield,
  calculateMonthlyPayment,
  calculateAnnualLoanPayments,
  getTenantRevenueForMonth,
  calculateAnnualTenantRevenue,
} from './hacienda.js';

describe('calculateAnnualAmortization', () => {
  it('calculates 3% of the building value based on higher of purchase price or cadastral value', () => {
    const result = calculateAnnualAmortization({
      purchasePrice: 200000,
      cadastralValue: 180000,
      buildingValuePercentage: 0.8,
    });
    // higherValue = 200000, buildingValue = 200000 * 0.8 = 160000, 3% = 4800
    expect(result).toBe(4800);
  });

  it('uses cadastral value if higher than purchase price', () => {
    const result = calculateAnnualAmortization({
      purchasePrice: 150000,
      cadastralValue: 200000,
      buildingValuePercentage: 0.7,
    });
    // higherValue = 200000, buildingValue = 200000 * 0.7 = 140000, 3% = 4200
    expect(result).toBe(4200);
  });

  it('returns 0 when building value percentage is 0', () => {
    const result = calculateAnnualAmortization({
      purchasePrice: 200000,
      cadastralValue: 0,
      buildingValuePercentage: 0,
    });
    expect(result).toBe(0);
  });
});

describe('calculateNetYield', () => {
  it('calculates net yield with no capping needed', () => {
    const result = calculateNetYield({
      totalRevenue: 12000,
      interests: 3000,
      repairs: 500,
      otherDeductibleExpenses: 2000,
      amortization: 4800,
    });
    // capped = min(3000+500, 12000) = 3500
    // deductions = 3500 + 2000 + 4800 = 10300
    // netYield = 12000 - 10300 = 1700
    expect(result.netYield).toBe(1700);
    expect(result.totalDeductions).toBe(10300);
    expect(result.isCapped).toBe(false);
    expect(result.excessToCarryForward).toBe(0);
  });

  it('caps interests + repairs when they exceed total revenue', () => {
    const result = calculateNetYield({
      totalRevenue: 10000,
      interests: 8000,
      repairs: 4000,
      otherDeductibleExpenses: 1000,
      amortization: 2000,
    });
    // capped = min(8000+4000, 10000) = 10000
    // deductions = 10000 + 1000 + 2000 = 13000
    // netYield = 10000 - 13000 = -3000
    expect(result.netYield).toBe(-3000);
    expect(result.isCapped).toBe(true);
    expect(result.excessToCarryForward).toBe(2000); // (8000+4000) - 10000
  });

  it('handles zero revenue', () => {
    const result = calculateNetYield({
      totalRevenue: 0,
      interests: 1000,
      repairs: 0,
      otherDeductibleExpenses: 500,
      amortization: 200,
    });
    // cappedExpenses = min(1000, 0) = 0
    // totalDeductions = 0 + 500 + 200 = 700
    // netYield = 0 - 700 = -700
    expect(result.netYield).toBe(-700);
    expect(result.isCapped).toBe(true);
    expect(result.excessToCarryForward).toBe(1000);
  });
});

describe('calculateMonthlyPayment', () => {
  it('calculates French amortization monthly payment correctly', () => {
    // 150000€ at 3% for 30 years
    const payment = calculateMonthlyPayment(150000, 3, 30);
    expect(payment).toBeCloseTo(632.41, 0);
  });

  it('handles zero interest rate', () => {
    const payment = calculateMonthlyPayment(120000, 0, 10);
    expect(payment).toBe(1000); // 120000 / 120 months
  });

  it('returns positive payment for typical inputs', () => {
    const payment = calculateMonthlyPayment(200000, 3.5, 30);
    expect(payment).toBeGreaterThan(0);
  });
});

describe('calculateAnnualLoanPayments', () => {
  it('calculates annual interest and principal for a given year', () => {
    const result = calculateAnnualLoanPayments({
      principal: 150000,
      interestRate: 3,
      termYears: 30,
      startDate: '2024-01-15',
      yearToQuery: 2025,
    });
    expect(result.annualTotalPayment).toBeGreaterThan(0);
    expect(result.annualInterest).toBeGreaterThan(0);
    expect(result.annualPrincipal).toBeGreaterThan(0);
    expect(result.annualInterest + result.annualPrincipal).toBeCloseTo(result.annualTotalPayment, 2);
  });

  it('returns zero for a year before the loan starts', () => {
    const result = calculateAnnualLoanPayments({
      principal: 150000,
      interestRate: 3,
      termYears: 30,
      startDate: '2024-01-15',
      yearToQuery: 2020,
    });
    expect(result.annualInterest).toBe(0);
    expect(result.annualPrincipal).toBe(0);
  });

  it('handles zero interest rate', () => {
    const result = calculateAnnualLoanPayments({
      principal: 120000,
      interestRate: 0,
      termYears: 10,
      startDate: '2024-06-01',
      yearToQuery: 2024,
    });
    // 120000 / 120 months = 1000 per month, partial year 2024 (7 months)
    expect(result.annualPrincipal).toBeCloseTo(7000, 0);
    expect(result.annualInterest).toBe(0);
  });
});

describe('getTenantRevenueForMonth', () => {
  it('returns full monthly rent for a tenant active the whole month', () => {
    const result = getTenantRevenueForMonth(
      { id: 1, name: 'Tenant', monthlyRent: 900, startDate: '2024-01-01', endDate: null },
      2024, 6 // June
    );
    expect(result.revenue).toBeCloseTo(900, 1);
    expect(result.activeDays).toBe(30);
  });

  it('prorates revenue for tenant starting mid-month', () => {
    const result = getTenantRevenueForMonth(
      { id: 1, name: 'Tenant', monthlyRent: 930, startDate: '2024-06-15', endDate: null },
      2024, 6 // June has 30 days
    );
    // 930 / 30 * 16 days (June 15-30 inclusive)
    expect(result.revenue).toBeCloseTo(496, 0);
    expect(result.activeDays).toBe(16);
  });

  it('returns 0 for tenant not active in the given month', () => {
    const result = getTenantRevenueForMonth(
      { id: 1, name: 'Tenant', monthlyRent: 900, startDate: '2024-01-01', endDate: '2024-03-31' },
      2024, 6
    );
    expect(result.revenue).toBe(0);
  });
});

describe('calculateAnnualTenantRevenue', () => {
  it('sums up monthly revenues for all tenants across the year', () => {
    const tenants = [
      { id: 1, name: 'Tenant A', monthlyRent: 1000, startDate: '2024-01-01', endDate: null },
      { id: 2, name: 'Tenant B', monthlyRent: 800, startDate: '2024-03-01', endDate: '2024-06-30' },
    ];
    const total = calculateAnnualTenantRevenue(tenants, 2024);
    // Tenant A: 12 * 1000 = 12000
    // Tenant B: 4 * 800 = 3200 (Mar, Apr, May, Jun)
    expect(total).toBeCloseTo(15200, 0);
  });
});
