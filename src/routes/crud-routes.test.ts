import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockChain = vi.hoisted(() => {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(),
    then: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.returning.mockReturnValue(chain);
  chain.then.mockImplementation((resolve: any) => Promise.resolve([]).then(resolve));
  return chain;
});

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => mockChain),
  insert: vi.fn(() => mockChain),
  update: vi.fn(() => mockChain),
  delete: vi.fn(() => mockChain),
}));

vi.mock('../db/index.js', () => ({ db: mockDb }));

import expensesRoute from './expenses.js';
import revenuesRoute from './revenues.js';
import tenantsRoute from './tenants.js';
import loansRoute from './loans.js';
import recurringExpensesRoute from './recurringExpenses.js';

const mount = (route: any, prefix: string) => {
  const app = new Hono();
  app.route(prefix, route);
  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.from.mockReturnValue(mockChain);
  mockChain.where.mockReturnValue(mockChain);
  mockChain.values.mockReturnValue(mockChain);
  mockChain.set.mockReturnValue(mockChain);
  mockChain.returning.mockReturnValue(mockChain);
  mockDb.select.mockReturnValue(mockChain);
  mockDb.insert.mockReturnValue(mockChain);
  mockDb.update.mockReturnValue(mockChain);
  mockDb.delete.mockReturnValue(mockChain);
});

function mockResolve(data: any) {
  mockChain.then.mockImplementation((resolve: any) => Promise.resolve(data).then(resolve));
}

describe('expenses route', () => {
  const app = mount(expensesRoute, '/expenses');

  it('GET /property/:propertyId', async () => {
    mockResolve([]);
    const res = await app.request('/expenses/property/1');
    expect(res.status).toBe(200);
  });

  it('POST / — creates', async () => {
    mockResolve([{ id: 1, amount: 50000, type: 'repair', propertyId: 1, date: '2024-06-01', description: null }]);
    const res = await app.request('/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, amount: 500, type: 'repair', date: '2024-06-01' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).amount).toBe(500);
  });

  it('PATCH /:id — updates', async () => {
    mockResolve([{ id: 1, amount: 30000, type: 'repair', propertyId: 1, date: '2024-06-01', description: null }]);
    const res = await app.request('/expenses/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 300 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — partial without amount', async () => {
    mockResolve([{ id: 1, amount: 50000, type: 'tax', propertyId: 1, date: '2024-06-01', description: null }]);
    const res = await app.request('/expenses/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tax' }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/expenses/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockResolve([{ id: 1 }]);
    const res = await app.request('/expenses/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/expenses/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('revenues route', () => {
  const app = mount(revenuesRoute, '/revenues');

  it('GET /property/:propertyId', async () => {
    mockResolve([]);
    const res = await app.request('/revenues/property/1');
    expect(res.status).toBe(200);
  });

  it('POST / — creates', async () => {
    mockResolve([{ id: 1, amount: 80000, propertyId: 1, date: '2024-06-01', description: null }]);
    const res = await app.request('/revenues', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, amount: 800, date: '2024-06-01' }),
    });
    expect(res.status).toBe(201);
  });

  it('PATCH /:id', async () => {
    mockResolve([{ id: 1, amount: 90000, propertyId: 1, date: '2024-06-01', description: null }]);
    const res = await app.request('/revenues/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 900 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — partial without amount', async () => {
    mockResolve([{ id: 1, amount: 80000, propertyId: 1, date: '2024-07-01', description: 'updated' }]);
    const res = await app.request('/revenues/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'updated' }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/revenues/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockResolve([{ id: 1 }]);
    const res = await app.request('/revenues/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/revenues/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('tenants route', () => {
  const app = mount(tenantsRoute, '/tenants');

  it('GET /property/:propertyId', async () => {
    mockResolve([]);
    const res = await app.request('/tenants/property/1');
    expect(res.status).toBe(200);
  });

  it('GET /property/:propertyId — with tenants and rent increases', async () => {
    const tenant = {
      id: 1, propertyId: 1, name: 'Test', startDate: '2024-01-01',
      endDate: null, monthlyRent: 100000,
    };
    mockResolve([tenant]);
    const res = await app.request('/tenants/property/1');
    const body = await res.json() as any[];
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].monthlyRent).toBe(1000);
    expect(Array.isArray(body[0].rentIncreases)).toBe(true);
  });

  it('POST / — creates', async () => {
    mockResolve([{ id: 1, name: 'John', monthlyRent: 80000, propertyId: 1, startDate: '2024-01-01', endDate: null }]);
    const res = await app.request('/tenants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'John', monthlyRent: 800, startDate: '2024-01-01', endDate: null }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).monthlyRent).toBe(800);
  });

  it('PATCH /:id', async () => {
    mockResolve([{ id: 1, name: 'John Updated', monthlyRent: 90000, propertyId: 1, startDate: '2024-01-01', endDate: null }]);
    const res = await app.request('/tenants/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Updated', monthlyRent: 900 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/tenants/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockResolve([{ id: 1 }]);
    const res = await app.request('/tenants/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/tenants/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  describe('rent increases', () => {
    const increaseFixture = { id: 1, tenantId: 1, yearOffset: 1, percentage: 2, applied: 0 };

    it('GET /:tenantId/increases — lists increases', async () => {
      mockResolve([increaseFixture]);
      const res = await app.request('/tenants/1/increases');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(body.length).toBe(1);
      expect(body[0].yearOffset).toBe(1);
      expect(body[0].percentage).toBe(2);
      expect(body[0].applied).toBe(false);
    });

    it('GET /:tenantId/increases — empty list', async () => {
      mockResolve([]);
      const res = await app.request('/tenants/2/increases');
      expect(res.status).toBe(200);
      expect((await res.json())).toEqual([]);
    });

    it('POST /:tenantId/increases — creates increase', async () => {
      // First then() call from select (dup check) returns [], second from insert returns created
      let callCount = 0;
      mockChain.then.mockImplementation((resolve: any) => {
        const data = callCount === 0 ? [] : [{ id: 2, tenantId: 1, yearOffset: 2, percentage: 3, applied: 0 }];
        callCount++;
        return Promise.resolve(data).then(resolve);
      });
      const res = await app.request('/tenants/1/increases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearOffset: 2, percentage: 3 }),
      });
      expect(res.status).toBe(201);
      const body = await res.json() as any;
      expect(body.yearOffset).toBe(2);
      expect(body.percentage).toBe(3);
      expect(body.applied).toBe(false);
    });

    it('POST /:tenantId/increases — 409 duplicate year', async () => {
      mockResolve([increaseFixture]);
      const res = await app.request('/tenants/1/increases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearOffset: 1, percentage: 5 }),
      });
      expect(res.status).toBe(409);
    });

    it('PATCH /:tenantId/increases/:increaseId — updates increase', async () => {
      mockResolve([{ id: 1, tenantId: 1, yearOffset: 1, percentage: 3, applied: 1 }]);
      const res = await app.request('/tenants/1/increases/1', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: 3, applied: true }),
      });
      expect(res.status).toBe(200);
      const body = await res.json() as any;
      expect(body.percentage).toBe(3);
      expect(body.applied).toBe(true);
    });

    it('PATCH /:tenantId/increases/:increaseId — 404', async () => {
      mockResolve([]);
      const res = await app.request('/tenants/1/increases/999', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: 10 }),
      });
      expect(res.status).toBe(404);
    });

    it('DELETE /:tenantId/increases/:increaseId — deletes increase', async () => {
      mockResolve([{ id: 1 }]);
      const res = await app.request('/tenants/1/increases/1', { method: 'DELETE' });
      expect(res.status).toBe(200);
    });

    it('DELETE /:tenantId/increases/:increaseId — 404', async () => {
      mockResolve([]);
      const res = await app.request('/tenants/1/increases/999', { method: 'DELETE' });
      expect(res.status).toBe(404);
    });
  });
});

describe('loans route', () => {
  const app = mount(loansRoute, '/loans');

  it('GET /property/:propertyId', async () => {
    mockResolve([]);
    const res = await app.request('/loans/property/1');
    expect(res.status).toBe(200);
  });

  it('POST / — creates', async () => {
    mockResolve([{ id: 1, name: 'Loan1', principal: 100000000, interestRate: 3, termYears: 25, propertyId: 1, startDate: '2024-01-01' }]);
    const res = await app.request('/loans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'Loan1', principal: 1000000, interestRate: 3, termYears: 25, startDate: '2024-01-01' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).principal).toBe(1000000);
  });

  it('POST / — creates with actualPayment', async () => {
    mockResolve([{ id: 2, name: 'Loan2', principal: 100000000, interestRate: 3, termYears: 25, propertyId: 1, startDate: '2024-01-01', actualPayment: 533000 }]);
    const res = await app.request('/loans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'Loan2', principal: 1000000, interestRate: 3, termYears: 25, startDate: '2024-01-01', actualPayment: 5330 }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).actualPayment).toBe(5330);
  });

  it('PATCH /:id', async () => {
    mockResolve([{ id: 1, name: 'Loan1', principal: 150000000, interestRate: 3, termYears: 25, propertyId: 1, startDate: '2024-01-01' }]);
    const res = await app.request('/loans/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ principal: 1500000 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — with actualPayment', async () => {
    mockResolve([{ id: 1, name: 'Loan1', principal: 100000000, interestRate: 3, termYears: 25, propertyId: 1, startDate: '2024-01-01', actualPayment: 533000 }]);
    const res = await app.request('/loans/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualPayment: 5330 }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as any).actualPayment).toBe(5330);
  });

  it('PATCH /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/loans/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockResolve([{ id: 1 }]);
    const res = await app.request('/loans/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/loans/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('recurringExpenses route', () => {
  const app = mount(recurringExpensesRoute, '/recurring-expenses');

  it('GET /property/:propertyId', async () => {
    mockResolve([]);
    const res = await app.request('/recurring-expenses/property/1');
    expect(res.status).toBe(200);
  });

  it('POST / — creates', async () => {
    mockResolve([{ id: 1, name: 'Insurance', amount: 60000, type: 'insurance_housing', frequency: 'annual', propertyId: 1, startDate: '2024-01-01' }]);
    const res = await app.request('/recurring-expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'Insurance', amount: 600, type: 'insurance_housing', frequency: 'annual', startDate: '2024-01-01' }),
    });
    expect(res.status).toBe(201);
  });

  it('POST / — creates with percentage', async () => {
    mockResolve([{ id: 2, name: 'Community', amount: 0, percentage: 8, type: 'community', frequency: 'monthly', propertyId: 1, startDate: '2024-01-01' }]);
    const res = await app.request('/recurring-expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'Community', type: 'community', percentage: 8, frequency: 'monthly', startDate: '2024-01-01' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).percentage).toBe(8);
  });

  it('PATCH /:id', async () => {
    mockResolve([{ id: 1, name: 'Insurance', amount: 70000, type: 'insurance_housing', frequency: 'annual', propertyId: 1, startDate: '2024-01-01' }]);
    const res = await app.request('/recurring-expenses/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 700 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — with percentage', async () => {
    mockResolve([{ id: 1, name: 'Community', amount: 0, percentage: 10, type: 'community', frequency: 'monthly', propertyId: 1, startDate: '2024-01-01' }]);
    const res = await app.request('/recurring-expenses/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentage: 10 }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as any).percentage).toBe(10);
  });

  it('PATCH /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/recurring-expenses/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockResolve([{ id: 1 }]);
    const res = await app.request('/recurring-expenses/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockResolve([]);
    const res = await app.request('/recurring-expenses/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
