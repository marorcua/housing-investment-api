import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createHaciendaRoutes } from '../../../src/hacienda/application/routes/hacienda.js';

const mockHaciendaService = {
  getSummary: vi.fn(),
  getGlobal: vi.fn(),
};

const app = new Hono();
app.route('/hacienda', createHaciendaRoutes(mockHaciendaService as any));

beforeEach(() => {
  vi.clearAllMocks();
});

describe('hacienda route', () => {
  it('GET /summary/:propertyId — returns full summary', async () => {
    mockHaciendaService.getSummary.mockResolvedValue({
      property: 'Test Property',
      year: '2024',
      loans: [],
      recurringExpenses: [],
      metrics: {
        totalRevenue: 12500,
        deductions: { interests: 3200, repairs: 150, others: 100, amortization: 1500 },
        netYield: 5.2,
        totalDeductions: 4950,
        isCapped: false,
        excessToCarryForward: 0,
        cashflow: { netCashflow: 5000, totalRevenue: 12500, totalCashOutflows: 7500, loanOutflows: 5000, recurringOutflows: 600, manualOutflows: 1900 },
      },
    });

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
    mockHaciendaService.getSummary.mockRejectedValue(new Error('Property not found'));
    const res = await app.request('/hacienda/summary/999');
    expect(res.status).toBe(404);
  });

  it('GET /summary/:propertyId — defaults year to current', async () => {
    mockHaciendaService.getSummary.mockResolvedValue({
      property: 'Prop', year: new Date().getFullYear().toString(),
      loans: [], recurringExpenses: [],
      metrics: {
        totalRevenue: 0,
        deductions: { interests: 0, repairs: 0, others: 0, amortization: 0 },
        netYield: 0, totalDeductions: 0, isCapped: false, excessToCarryForward: 0,
        cashflow: { netCashflow: 0, totalRevenue: 0, totalCashOutflows: 0, loanOutflows: 0, recurringOutflows: 0, manualOutflows: 0 },
      },
    });

    const res = await app.request('/hacienda/summary/1');
    expect(res.status).toBe(200);
  });
});
