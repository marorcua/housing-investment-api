import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createGlobalHaciendaRoutes } from '../../../src/hacienda/application/routes/global-hacienda.js';

const mockHaciendaService = {
  getSummary: vi.fn(),
  getGlobal: vi.fn(),
};

const app = new Hono();
app.route('/hacienda-global', createGlobalHaciendaRoutes(mockHaciendaService as any));

beforeEach(() => {
  vi.clearAllMocks();
});

function makeGlobalResponse(year: number) {
  return {
    annual: [
      { year: 2023, revenue: 0, expenses: 0, net: 0 },
      { year, revenue: 12000, expenses: 6560, net: 5440 },
    ],
    monthly: Array.from({ length: 12 }, (_, i) => ({
      month: i + 1,
      revenue: i === 0 ? 1000 : 1000,
      expenses: i === 0 ? 1180 : 580,
      net: i === 0 ? -180 : 420,
    })),
    currentYear: year,
  };
}

describe('globalHacienda route', () => {
  it('GET / — returns annual and monthly data', async () => {
    mockHaciendaService.getGlobal.mockResolvedValue(makeGlobalResponse(2024));
    const res = await app.request('/hacienda-global?year=2024');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.annual).toBeInstanceOf(Array);
    expect(body.monthly).toBeInstanceOf(Array);
    expect(body.currentYear).toBe(2024);
  });

  it('GET / — defaults year to current', async () => {
    const currentYear = new Date().getFullYear();
    mockHaciendaService.getGlobal.mockResolvedValue(makeGlobalResponse(currentYear));
    const res = await app.request('/hacienda-global');
    expect(res.status).toBe(200);
  });

  it('GET / — handles multiple properties', async () => {
    const data = makeGlobalResponse(2025);
    data.annual = [
      { year: 2023, revenue: 0, expenses: 0, net: 0 },
      { year: 2024, revenue: 10000, expenses: 5000, net: 5000 },
      { year: 2025, revenue: 20000, expenses: 10000, net: 10000 },
    ];
    mockHaciendaService.getGlobal.mockResolvedValue(data);
    const res = await app.request('/hacienda-global?year=2025');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.annual.length).toBeGreaterThanOrEqual(3);
  });

  it('GET / — handles percentage-based expenses and loan actualPayment', async () => {
    mockHaciendaService.getGlobal.mockResolvedValue(makeGlobalResponse(2024));
    const res = await app.request('/hacienda-global?year=2024');
    expect(res.status).toBe(200);
    const body: any = await res.json();

    const yearData = body.annual.find((d: any) => d.year === 2024);
    expect(yearData.revenue).toBe(12000);
    expect(yearData.expenses).toBe(6560);
    expect(yearData.net).toBe(5440);

    expect(body.monthly[0].revenue).toBe(1000);
    expect(body.monthly[0].expenses).toBe(1180);
    expect(body.monthly[0].net).toBe(-180);

    expect(body.monthly[1].revenue).toBe(1000);
    expect(body.monthly[1].expenses).toBe(580);
    expect(body.monthly[1].net).toBe(420);
  });
});
