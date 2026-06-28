import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockChain = vi.hoisted(() => {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    then: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.then.mockImplementation((resolve: any) => Promise.resolve([]).then(resolve));
  return chain;
});

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => mockChain),
}));

vi.mock('../db/index.js', () => ({ db: mockDb }));

vi.mock('../services/hacienda.js', () => ({
  calculateAnnualAmortization: vi.fn(() => 1500),
  calculateNetYield: vi.fn(() => ({
    netYield: 5.2,
    taxableBase: 10000,
    taxLiability: 1900,
    effectiveRate: 19,
  })),
  calculateAnnualLoanPayments: vi.fn(() => ({
    annualInterest: 3000,
    annualPrincipal: 2000,
    annualTotalPayment: 5000,
  })),
  calculateAnnualTenantRevenue: vi.fn(() => 12000),
}));

import haciendaRoute from './hacienda.js';

const app = new Hono();
app.route('/hacienda', haciendaRoute);

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.from.mockReturnValue(mockChain);
  mockChain.where.mockReturnValue(mockChain);
  mockDb.select.mockReturnValue(mockChain);
});

function seqThen(results: any[][]) {
  let idx = 0;
  mockChain.then.mockImplementation((resolve: any) => {
    const data = results[idx] !== undefined ? results[idx] : [];
    idx++;
    return Promise.resolve(data).then(resolve);
  });
}

describe('hacienda route', () => {
  it('GET /summary/:propertyId — returns full summary', async () => {
    seqThen([
      [{ id: 1, name: 'Test Property', purchasePrice: 20000000, cadastralValue: 15000000, buildingValue: 12000000 }],
      [{ id: 1, propertyId: 1, amount: 50000, date: '2024-06-01', description: null }],
      [{ id: 1, name: 'Tenant A', monthlyRent: 80000, startDate: '2024-01-01', endDate: null }],
      [
        { id: 1, propertyId: 1, amount: 20000, type: 'interest', date: '2024-03-01', description: null },
        { id: 2, propertyId: 1, amount: 15000, type: 'repair', date: '2024-04-01', description: null },
        { id: 3, propertyId: 1, amount: 10000, type: 'tax', date: '2024-05-01', description: null },
      ],
      [{ id: 1, name: 'Loan1', principal: 100000000, interestRate: 3, termYears: 25, startDate: '2024-01-01', propertyId: 1 }],
      [{ id: 1, name: 'Insurance', amount: 60000, type: 'insurance_housing', frequency: 'annual', startDate: '2023-01-01', propertyId: 1 }],
    ]);

    const res = await app.request('/hacienda/summary/1?year=2024');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.property).toBe('Test Property');
    expect(body.year).toBe('2024');
    expect(body.metrics.totalRevenue).toBe(12500);
    expect(body.metrics.deductions.interests).toBe(3200);
    expect(body.metrics.deductions.repairs).toBe(150);
    expect(body.metrics.deductions.amortization).toBe(1500);
    expect(body.metrics.netYield).toBe(5.2);
    expect(body.metrics.cashflow).toBeDefined();
  });

  it('GET /summary/:propertyId — 404 for missing property', async () => {
    seqThen([[]]);
    const res = await app.request('/hacienda/summary/999');
    expect(res.status).toBe(404);
  });

  it('GET /summary/:propertyId — handles recurring expense starting after year', async () => {
    seqThen([
      [{ id: 1, name: 'Prop', purchasePrice: 10000000, cadastralValue: null, buildingValue: null }],
      [],
      [],
      [],
      [],
      [
        { id: 1, name: 'Future Insurance', amount: 60000, type: 'insurance_housing', frequency: 'annual', startDate: '2025-01-01', propertyId: 1 }
      ],
    ]);

    const res = await app.request('/hacienda/summary/1?year=2024');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    const futureRecurring = body.recurringExpenses.find((r: any) => r.name === 'Future Insurance');
    expect(futureRecurring.annualCost).toBe(0);
  });

  it('GET /summary/:propertyId — defaults year to current', async () => {
    seqThen([
      [{ id: 1, name: 'Prop', purchasePrice: 10000000, cadastralValue: null, buildingValue: null }],
      [], [], [], [], [],
    ]);

    const res = await app.request('/hacienda/summary/1');
    expect(res.status).toBe(200);
  });
});
