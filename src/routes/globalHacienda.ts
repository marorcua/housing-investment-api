import { Hono } from 'hono';
import { db } from '../db/index.js';
import { properties, tenants, loans, recurringExpenses, revenues, expenses } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { calculateAnnualTenantRevenue, calculateAnnualLoanPayments, getTenantRevenueForMonth, calculateMonthlyPayment } from '../services/hacienda.js';
import type { TenantForRevenue } from '../services/hacienda.js';
import { centsToEuros } from '../utils/money.js';

const globalHaciendaRoute = new Hono();

globalHaciendaRoute.get('/', async (c) => {
  const yearParam = c.req.query('year');
  const queryYear = yearParam ? parseInt(yearParam) : new Date().getFullYear();

  const allProperties = await db.select().from(properties);

  // Pre-fetch all data per property to avoid N+1 in loops
  const propData = await Promise.all(allProperties.map(async (prop) => ({
    id: prop.id,
    tenants: await db.select().from(tenants).where(eq(tenants.propertyId, prop.id)),
    loans: await db.select().from(loans).where(eq(loans.propertyId, prop.id)),
    recurringExpenses: await db.select().from(recurringExpenses).where(eq(recurringExpenses.propertyId, prop.id)),
    revenues: await db.select().from(revenues).where(eq(revenues.propertyId, prop.id)),
    expenses: await db.select().from(expenses).where(eq(expenses.propertyId, prop.id)),
  })));

  // Determine year range
  const minYear = Math.min(
    ...propData.flatMap(p => [
      ...p.tenants.map(t => new Date(t.startDate).getFullYear()),
      ...p.loans.map(l => new Date(l.startDate).getFullYear()),
      ...p.recurringExpenses.map(r => new Date(r.startDate).getFullYear()),
      ...p.revenues.map(r => new Date(r.date).getFullYear()),
    ]),
    2023
  );
  const maxYear = Math.max(queryYear, new Date().getFullYear());

  // --- Annual summary for each year ---
  const annual: { year: number; revenue: number; expenses: number; net: number }[] = [];
  for (let year = minYear; year <= maxYear; year++) {
    let totalRevenue = 0;
    let totalExpenses = 0;

    for (const pd of propData) {
      // Tenant revenue
      const tenantInputs: TenantForRevenue[] = pd.tenants.map(t => ({
        id: t.id,
        name: t.name,
        monthlyRent: centsToEuros(t.monthlyRent),
        startDate: t.startDate,
        endDate: t.endDate,
      }));
      totalRevenue += calculateAnnualTenantRevenue(tenantInputs, year);

      // Manual revenues
      const yearlyRevenues = pd.revenues.filter(r => r.date.startsWith(year.toString()));
      totalRevenue += yearlyRevenues.reduce((acc, r) => acc + centsToEuros(r.amount), 0);

      let propExpenses = 0;

      // Manual expenses
      const yearlyExpenses = pd.expenses.filter(e => e.date.startsWith(year.toString()));
      propExpenses += yearlyExpenses.reduce((acc, e) => acc + centsToEuros(e.amount), 0);

      // Loan payments
      for (const loan of pd.loans) {
        const breakdown = calculateAnnualLoanPayments({
          principal: centsToEuros(loan.principal),
          interestRate: loan.interestRate,
          termYears: loan.termYears,
          startDate: loan.startDate,
          yearToQuery: year,
        });
        propExpenses += breakdown.annualTotalPayment;
      }

      // Recurring expenses
      for (const re of pd.recurringExpenses) {
        const startYear = new Date(re.startDate).getFullYear();
        if (startYear <= year) {
          const amt = centsToEuros(re.amount);
          propExpenses += re.frequency === 'monthly' ? amt * 12 : amt;
        }
      }

      totalExpenses += propExpenses;
    }

    annual.push({ year, revenue: Math.round(totalRevenue * 100) / 100, expenses: Math.round(totalExpenses * 100) / 100, net: Math.round((totalRevenue - totalExpenses) * 100) / 100 });
  }

  // --- Monthly breakdown for the query year ---
  const monthly: { month: number; revenue: number; expenses: number; net: number }[] = [];
  for (let month = 1; month <= 12; month++) {
    let monthRev = 0;
    let monthExp = 0;

    for (const pd of propData) {
      // Tenant revenue for this month
      for (const t of pd.tenants) {
        const tr = getTenantRevenueForMonth({
          id: t.id,
          name: t.name,
          monthlyRent: centsToEuros(t.monthlyRent),
          startDate: t.startDate,
          endDate: t.endDate,
        }, queryYear, month);
        monthRev += tr.revenue;
      }

      // Manual revenues for this month
      const mPrefix = `${queryYear}-${String(month).padStart(2, '0')}`;
      const monthRevenues = pd.revenues.filter(r => r.date.startsWith(mPrefix));
      monthRev += monthRevenues.reduce((acc, r) => acc + centsToEuros(r.amount), 0);

      let monthExpTotal = 0;

      // Manual expenses for this month
      const monthExpenses = pd.expenses.filter(e => e.date.startsWith(mPrefix));
      monthExpTotal += monthExpenses.reduce((acc, e) => acc + centsToEuros(e.amount), 0);

      // Loan payment for this month
      for (const loan of pd.loans) {
        const start = new Date(loan.startDate);
        const sYear = start.getFullYear();
        const sMonth = start.getMonth() + 1;
        const elapsedMonths = (queryYear - sYear) * 12 + (month - sMonth);
        const totalLoanMonths = loan.termYears * 12;
        if (elapsedMonths >= 0 && elapsedMonths < totalLoanMonths) {
          monthExpTotal += calculateMonthlyPayment(centsToEuros(loan.principal), loan.interestRate, loan.termYears);
        }
      }

      // Recurring expense for this month
      for (const re of pd.recurringExpenses) {
        const start = new Date(re.startDate);
        const sYear = start.getFullYear();
        const sMonth = start.getMonth() + 1;
        if (queryYear > sYear || (queryYear === sYear && month >= sMonth)) {
          if (re.frequency === 'monthly') {
            monthExpTotal += centsToEuros(re.amount);
          } else if (re.frequency === 'annual' && month === sMonth) {
            monthExpTotal += centsToEuros(re.amount);
          }
        }
      }

      monthExp += monthExpTotal;
    }

    monthly.push({ month, revenue: Math.round(monthRev * 100) / 100, expenses: Math.round(monthExp * 100) / 100, net: Math.round((monthRev - monthExp) * 100) / 100 });
  }

  return c.json({ annual, monthly, currentYear: queryYear });
});

export default globalHaciendaRoute;
