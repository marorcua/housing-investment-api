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
  calculateAnnualTenantRevenue: vi.fn(() => 12000),
  calculateAnnualLoanPayments: vi.fn(() => ({
    annualInterest: 3000,
    annualPrincipal: 2000,
    annualTotalPayment: 5000,
  })),
  getTenantRevenueForMonth: vi.fn(() => ({ revenue: 1000, isActive: true })),
  calculateMonthlyPayment: vi.fn(() => 500),
}));

import globalHaciendaRoute from './globalHacienda.js';

const app = new Hono();
app.route('/hacienda-global', globalHaciendaRoute);

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.from.mockReturnValue(mockChain);
  mockChain.where.mockReturnValue(mockChain);
  mockDb.select.mockReturnValue(mockChain);
});

function makeChainResolve(data: any) {
  // Create a fresh thenable mock that resolves to given data
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    then: vi.fn((resolve: any) => Promise.resolve(data).then(resolve)),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  return chain;
}

describe('globalHacienda route', () => {
  it('GET / — returns annual and monthly data', async () => {
    const propertiesChain = makeChainResolve([
      { id: 1, name: 'Prop A', purchasePrice: 20000000, purchaseDate: '2023-01-01', cadastralValue: null, buildingValue: null }
    ]);
    const emptyChain = makeChainResolve([]);

    mockDb.select
      .mockReturnValueOnce(propertiesChain)  // first select gets properties
      .mockReturnValue(emptyChain);           // all subsequent selects get empty

    const res = await app.request('/hacienda-global?year=2024');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.annual).toBeInstanceOf(Array);
    expect(body.monthly).toBeInstanceOf(Array);
    expect(body.currentYear).toBe(2024);
  });

  it('GET / — defaults year to current', async () => {
    const emptyChain = makeChainResolve([]);
    mockDb.select.mockReturnValue(emptyChain);

    const res = await app.request('/hacienda-global');
    expect(res.status).toBe(200);
  });

  it('GET / — handles multiple properties', async () => {
    const propertiesChain = makeChainResolve([
      { id: 1, name: 'A', purchasePrice: 10000000, purchaseDate: '2023-01-01', cadastralValue: null, buildingValue: null },
      { id: 2, name: 'B', purchasePrice: 20000000, purchaseDate: '2024-01-01', cadastralValue: null, buildingValue: null },
    ]);
    const emptyChain = makeChainResolve([]);

    mockDb.select
      .mockReturnValueOnce(propertiesChain)
      .mockReturnValue(emptyChain);

    const res = await app.request('/hacienda-global?year=2025');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.annual.length).toBeGreaterThanOrEqual(3);
  });
});
