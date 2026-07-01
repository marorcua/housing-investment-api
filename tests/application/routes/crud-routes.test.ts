import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createExpensesRoutes } from '../../../src/expenses/application/routes/expenses.js';
import { createRevenuesRoutes } from '../../../src/revenues/application/routes/revenues.js';
import { createTenantsRoutes } from '../../../src/tenants/application/routes/tenants.js';
import { createLoansRoutes } from '../../../src/loans/application/routes/loans.js';
import { createRecurringExpensesRoutes } from '../../../src/recurring-expenses/application/routes/recurring-expenses.js';
import { Expense } from '../../../src/expenses/domain/entities/Expense.js';
import { Revenue } from '../../../src/revenues/domain/entities/Revenue.js';
import { Tenant } from '../../../src/tenants/domain/entities/Tenant.js';
import { Loan } from '../../../src/loans/domain/entities/Loan.js';
import { RecurringExpense } from '../../../src/recurring-expenses/domain/entities/RecurringExpense.js';
import { Money } from '../../../src/shared/domain/valueObjects/Money.js';

const mount = (route: any, prefix: string) => {
  const app = new Hono();
  app.route(prefix, route);
  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('expenses route', () => {
  const mockService = { listByProperty: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const app = mount(createExpensesRoutes(mockService as any), '/expenses');

  it('GET /property/:propertyId', async () => {
    mockService.listByProperty.mockResolvedValue([]);
    const res = await app.request('/expenses/property/1');
    expect(res.status).toBe(200);
  });

  it('POST / — creates', async () => {
    mockService.create.mockResolvedValue(new Expense(1, 1, Money.fromEuros(500), 'repair', '2024-06-01', null));
    const res = await app.request('/expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, amount: 500, type: 'repair', date: '2024-06-01' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).amount).toBe(500);
  });

  it('PATCH /:id — updates', async () => {
    mockService.update.mockResolvedValue(new Expense(1, 1, Money.fromEuros(300), 'repair', '2024-06-01', null));
    const res = await app.request('/expenses/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 300 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — partial without amount', async () => {
    mockService.update.mockResolvedValue(new Expense(1, 1, Money.fromEuros(500), 'tax', '2024-06-01', null));
    const res = await app.request('/expenses/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'tax' }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — 404', async () => {
    mockService.update.mockResolvedValue(null);
    const res = await app.request('/expenses/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockService.delete.mockResolvedValue(true);
    const res = await app.request('/expenses/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockService.delete.mockResolvedValue(false);
    const res = await app.request('/expenses/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('revenues route', () => {
  const mockService = { listByProperty: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const app = mount(createRevenuesRoutes(mockService as any), '/revenues');

  it('GET /property/:propertyId', async () => {
    mockService.listByProperty.mockResolvedValue([]);
    const res = await app.request('/revenues/property/1');
    expect(res.status).toBe(200);
  });

  it('POST / — creates', async () => {
    mockService.create.mockResolvedValue(new Revenue(1, 1, Money.fromEuros(800), '2024-06-01', null));
    const res = await app.request('/revenues', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, amount: 800, date: '2024-06-01' }),
    });
    expect(res.status).toBe(201);
  });

  it('PATCH /:id', async () => {
    mockService.update.mockResolvedValue(new Revenue(1, 1, Money.fromEuros(900), '2024-06-01', null));
    const res = await app.request('/revenues/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 900 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — partial without amount', async () => {
    mockService.update.mockResolvedValue(new Revenue(1, 1, Money.fromEuros(800), '2024-07-01', 'updated'));
    const res = await app.request('/revenues/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ description: 'updated' }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — 404', async () => {
    mockService.update.mockResolvedValue(null);
    const res = await app.request('/revenues/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 100 }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockService.delete.mockResolvedValue(true);
    const res = await app.request('/revenues/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockService.delete.mockResolvedValue(false);
    const res = await app.request('/revenues/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('tenants route', () => {
  const mockService = { listByProperty: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn(), listIncreases: vi.fn(), createIncrease: vi.fn(), updateIncrease: vi.fn(), deleteIncrease: vi.fn() };
  const app = mount(createTenantsRoutes(mockService as any), '/tenants');

  it('GET /property/:propertyId', async () => {
    mockService.listByProperty.mockResolvedValue([]);
    const res = await app.request('/tenants/property/1');
    expect(res.status).toBe(200);
  });

  it('GET /property/:propertyId — with tenants and rent increases', async () => {
    const tenant = new Tenant(1, 1, 'Test', '2024-01-01', null, Money.fromEuros(1000), []);
    mockService.listByProperty.mockResolvedValue([tenant]);
    const res = await app.request('/tenants/property/1');
    const body = await res.json() as any[];
    expect(res.status).toBe(200);
    expect(body).toHaveLength(1);
    expect(body[0].monthlyRent).toBe(1000);
    expect(Array.isArray(body[0].rentIncreases)).toBe(true);
  });

  it('POST / — creates', async () => {
    mockService.create.mockResolvedValue(new Tenant(1, 1, 'John', '2024-01-01', null, Money.fromEuros(800), []));
    const res = await app.request('/tenants', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'John', monthlyRent: 800, startDate: '2024-01-01' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).monthlyRent).toBe(800);
  });

  it('PATCH /:id', async () => {
    mockService.update.mockResolvedValue(new Tenant(1, 1, 'John Updated', '2024-01-01', null, Money.fromEuros(900), []));
    const res = await app.request('/tenants/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'John Updated', monthlyRent: 900 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — 404', async () => {
    mockService.update.mockResolvedValue(null);
    const res = await app.request('/tenants/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockService.delete.mockResolvedValue(true);
    const res = await app.request('/tenants/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockService.delete.mockResolvedValue(false);
    const res = await app.request('/tenants/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });

  describe('rent increases', () => {
    it('GET /:tenantId/increases — lists increases', async () => {
      mockService.listIncreases.mockResolvedValue([{ id: 1, tenantId: 1, yearOffset: 1, percentage: 2, applied: false }]);
      const res = await app.request('/tenants/1/increases');
      expect(res.status).toBe(200);
      const body = await res.json() as any[];
      expect(body.length).toBe(1);
      expect(body[0].yearOffset).toBe(1);
      expect(body[0].percentage).toBe(2);
      expect(body[0].applied).toBe(false);
    });

    it('GET /:tenantId/increases — empty list', async () => {
      mockService.listIncreases.mockResolvedValue([]);
      const res = await app.request('/tenants/2/increases');
      expect(res.status).toBe(200);
      expect((await res.json())).toEqual([]);
    });

    it('POST /:tenantId/increases — creates increase', async () => {
      mockService.createIncrease.mockResolvedValue({ id: 2, tenantId: 1, yearOffset: 2, percentage: 3, applied: false });
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
      mockService.createIncrease.mockRejectedValue(new Error('Duplicate increase for yearOffset'));
      const res = await app.request('/tenants/1/increases', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ yearOffset: 1, percentage: 5 }),
      });
      expect(res.status).toBe(409);
    });

    it('PATCH /:tenantId/increases/:increaseId — updates increase', async () => {
      mockService.updateIncrease.mockResolvedValue({ id: 1, tenantId: 1, yearOffset: 1, percentage: 3, applied: true });
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
      mockService.updateIncrease.mockResolvedValue(null);
      const res = await app.request('/tenants/1/increases/999', {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ percentage: 10 }),
      });
      expect(res.status).toBe(404);
    });

    it('DELETE /:tenantId/increases/:increaseId — deletes increase', async () => {
      mockService.deleteIncrease.mockResolvedValue(true);
      const res = await app.request('/tenants/1/increases/1', { method: 'DELETE' });
      expect(res.status).toBe(200);
    });

    it('DELETE /:tenantId/increases/:increaseId — 404', async () => {
      mockService.deleteIncrease.mockResolvedValue(false);
      const res = await app.request('/tenants/1/increases/999', { method: 'DELETE' });
      expect(res.status).toBe(404);
    });
  });
});

describe('loans route', () => {
  const mockService = { listByProperty: vi.fn(), get: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const app = mount(createLoansRoutes(mockService as any), '/loans');

  it('GET /property/:propertyId', async () => {
    mockService.listByProperty.mockResolvedValue([]);
    const res = await app.request('/loans/property/1');
    expect(res.status).toBe(200);
  });

  it('POST / — creates', async () => {
    mockService.create.mockResolvedValue(new Loan(1, 1, 'Loan1', Money.fromEuros(1000000), 3, 25, '2024-01-01', null));
    const res = await app.request('/loans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'Loan1', principal: 1000000, interestRate: 3, termYears: 25, startDate: '2024-01-01' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).principal).toBe(1000000);
  });

  it('POST / — creates with actualPayment', async () => {
    mockService.create.mockResolvedValue(new Loan(2, 1, 'Loan2', Money.fromEuros(1000000), 3, 25, '2024-01-01', Money.fromEuros(5330)));
    const res = await app.request('/loans', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'Loan2', principal: 1000000, interestRate: 3, termYears: 25, startDate: '2024-01-01', actualPayment: 5330 }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).actualPayment).toBe(5330);
  });

  it('PATCH /:id', async () => {
    mockService.update.mockResolvedValue(new Loan(1, 1, 'Loan1', Money.fromEuros(1500000), 3, 25, '2024-01-01', null));
    const res = await app.request('/loans/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ principal: 1500000 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — with actualPayment', async () => {
    mockService.update.mockResolvedValue(new Loan(1, 1, 'Loan1', Money.fromEuros(1000000), 3, 25, '2024-01-01', Money.fromEuros(5330)));
    const res = await app.request('/loans/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ actualPayment: 5330 }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as any).actualPayment).toBe(5330);
  });

  it('PATCH /:id — 404', async () => {
    mockService.update.mockResolvedValue(null);
    const res = await app.request('/loans/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockService.delete.mockResolvedValue(true);
    const res = await app.request('/loans/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockService.delete.mockResolvedValue(false);
    const res = await app.request('/loans/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});

describe('recurringExpenses route', () => {
  const mockService = { listByProperty: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() };
  const app = mount(createRecurringExpensesRoutes(mockService as any), '/recurring-expenses');

  it('GET /property/:propertyId', async () => {
    mockService.listByProperty.mockResolvedValue([]);
    const res = await app.request('/recurring-expenses/property/1');
    expect(res.status).toBe(200);
  });

  it('POST / — creates', async () => {
    mockService.create.mockResolvedValue(new RecurringExpense(1, 1, 'Insurance', 'insurance_housing', Money.fromEuros(600), null, 'annual', '2024-01-01'));
    const res = await app.request('/recurring-expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'Insurance', amount: 600, type: 'insurance_housing', frequency: 'annual', startDate: '2024-01-01' }),
    });
    expect(res.status).toBe(201);
  });

  it('POST / — creates with percentage', async () => {
    mockService.create.mockResolvedValue(new RecurringExpense(2, 1, 'Community', 'community', Money.zero(), 8, 'monthly', '2024-01-01'));
    const res = await app.request('/recurring-expenses', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ propertyId: 1, name: 'Community', type: 'community', percentage: 8, frequency: 'monthly', startDate: '2024-01-01' }),
    });
    expect(res.status).toBe(201);
    expect((await res.json() as any).percentage).toBe(8);
  });

  it('PATCH /:id', async () => {
    mockService.update.mockResolvedValue(new RecurringExpense(1, 1, 'Insurance', 'insurance_housing', Money.fromEuros(700), null, 'annual', '2024-01-01'));
    const res = await app.request('/recurring-expenses/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 700 }),
    });
    expect(res.status).toBe(200);
  });

  it('PATCH /:id — with percentage', async () => {
    mockService.update.mockResolvedValue(new RecurringExpense(1, 1, 'Community', 'community', Money.zero(), 10, 'monthly', '2024-01-01'));
    const res = await app.request('/recurring-expenses/1', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ percentage: 10 }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as any).percentage).toBe(10);
  });

  it('PATCH /:id — 404', async () => {
    mockService.update.mockResolvedValue(null);
    const res = await app.request('/recurring-expenses/999', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('DELETE /:id', async () => {
    mockService.delete.mockResolvedValue(true);
    const res = await app.request('/recurring-expenses/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
  });

  it('DELETE /:id — 404', async () => {
    mockService.delete.mockResolvedValue(false);
    const res = await app.request('/recurring-expenses/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
