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

vi.mock('../../../src/infrastructure/db/index.js', () => ({ db: mockDb }));

vi.mock('../../../src/domain/services/hacienda.js', () => ({
  calculateAnnualTenantRevenue: vi.fn(() => 12000),
  calculateAnnualLoanPayments: vi.fn(() => ({
    annualInterest: 3000,
    annualPrincipal: 2000,
    annualTotalPayment: 5000,
  })),
  getTenantRevenueForMonth: vi.fn(() => ({ revenue: 1000, isActive: true })),
  calculateMonthlyPayment: vi.fn(() => 500),
}));

import { calculateAnnualTenantRevenue, calculateAnnualLoanPayments, getTenantRevenueForMonth } from '../../../src/domain/services/hacienda.js';
import globalHaciendaRoute from '../../../src/application/routes/globalHacienda.js';

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

  it('GET / — handles percentage-based expenses and loan actualPayment', async () => {
    const propertiesChain = makeChainResolve([
      { id: 1, name: 'Prop', purchasePrice: 20000000, purchaseDate: '2023-01-01', cadastralValue: null, buildingValue: null }
    ]);
    const rentIncreasesChain = makeChainResolve([]);
    const tenantsChain = makeChainResolve([
      { id: 1, propertyId: 1, name: 'Tenant', monthlyRent: 100000, startDate: '2024-01-01', endDate: null },
    ]);
    const loansChain = makeChainResolve([
      { id: 1, propertyId: 1, name: 'Loan', principal: 100000000, interestRate: 3, termYears: 25, startDate: '2024-01-01', actualPayment: 50000 },
    ]);
    const recurringChain = makeChainResolve([
      { id: 1, propertyId: 1, name: 'Community', type: 'community', amount: 0, percentage: 8, frequency: 'monthly', startDate: '2024-01-01' },
      { id: 2, propertyId: 1, name: 'Insurance', type: 'insurance_housing', amount: 60000, percentage: null, frequency: 'annual', startDate: '2024-01-01' },
    ]);
    const emptyChain = makeChainResolve([]);

    mockDb.select
      .mockReturnValueOnce(propertiesChain)
      .mockReturnValueOnce(rentIncreasesChain)
      .mockReturnValueOnce(tenantsChain)
      .mockReturnValueOnce(loansChain)
      .mockReturnValueOnce(recurringChain)
      .mockReturnValueOnce(emptyChain)
      .mockReturnValueOnce(emptyChain);

    const res = await app.request('/hacienda-global?year=2024');
    expect(res.status).toBe(200);
    const body: any = await res.json();

    // Annual: 12000 tenant rev, 5000 loan + 960 (8% of 12000) + 600 (insurance annual) = 6560 exp, net = 5440
    const yearData = body.annual.find((d: any) => d.year === 2024);
    expect(yearData.revenue).toBe(12000);
    expect(yearData.expenses).toBe(6560);
    expect(yearData.net).toBe(5440);

    // Monthly (month 1): 1000 tenant rev, 500 loan + 80 (8% of 1000) + 600 (annual in start month) = 1180 exp, net = -180
    expect(body.monthly[0].revenue).toBe(1000);
    expect(body.monthly[0].expenses).toBe(1180);
    expect(body.monthly[0].net).toBe(-180);

    // Monthly (month 2): 1000 tenant rev, 500 loan + 80 = 580 exp, net = 420
    expect(body.monthly[1].revenue).toBe(1000);
    expect(body.monthly[1].expenses).toBe(580);
    expect(body.monthly[1].net).toBe(420);

    // Verify actualPayment was passed to the service
    expect(vi.mocked(calculateAnnualLoanPayments)).toHaveBeenCalledWith(
      expect.objectContaining({ actualPayment: 500 })
    );
    expect(vi.mocked(calculateAnnualTenantRevenue)).toHaveBeenCalled();
    expect(vi.mocked(getTenantRevenueForMonth)).toHaveBeenCalled();
  });
});
