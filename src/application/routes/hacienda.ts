import { Hono } from 'hono';
import { db } from '../../infrastructure/db/index.js';
import { properties, revenues, expenses, loans, recurringExpenses, tenants, rentIncreases } from '../../infrastructure/db/schema.js';
import { eq } from 'drizzle-orm';
import { calculateAnnualAmortization, calculateNetYield, calculateAnnualLoanPayments, calculateAnnualTenantRevenue } from '../../domain/services/hacienda.js';
import type { TenantForRevenue, RentIncreaseInfo } from '../../domain/services/hacienda.js';
import { centsToEuros } from '../../domain/money.js';

const haciendaRoute = new Hono();

haciendaRoute.get('/summary/:propertyId', async (c) => {
  const propertyId = parseInt(c.req.param('propertyId'));
  const year = c.req.query('year') || new Date().getFullYear().toString();
  const queryYearNum = parseInt(year);

  const [property] = await db.select().from(properties).where(eq(properties.id, propertyId));
  if (!property) return c.json({ error: 'Property not found' }, 404);

  // Convert property values to euros for calculations
  const purchasePriceEuros = centsToEuros(property.purchasePrice);
  const cadastralValueEuros = property.cadastralValue ? centsToEuros(property.cadastralValue) : 0;
  const buildingValueEuros = property.buildingValue ? centsToEuros(property.buildingValue) : 0;

  const allRevenues = await db.select().from(revenues).where(eq(revenues.propertyId, propertyId));
  const yearlyRevenues = allRevenues.filter(r => r.date.startsWith(year));
  const manualRevenue = yearlyRevenues.reduce((acc, r) => acc + centsToEuros(r.amount), 0);

  // Calculate tenant-derived revenue (rent contracts) with escalation
  const propertyTenants = await db.select().from(tenants).where(eq(tenants.propertyId, propertyId));
  const tenantRevenueInputs: TenantForRevenue[] = [];
  for (const t of propertyTenants) {
    const increases = await db.select().from(rentIncreases).where(eq(rentIncreases.tenantId, t.id));
    tenantRevenueInputs.push({
      id: t.id,
      name: t.name,
      monthlyRent: centsToEuros(t.monthlyRent),
      startDate: t.startDate,
      endDate: t.endDate,
      rentIncreases: increases.map(i => ({
        yearOffset: i.yearOffset,
        percentage: i.percentage,
        applied: !!i.applied,
      })),
    });
  }
  const tenantRevenue = calculateAnnualTenantRevenue(tenantRevenueInputs, queryYearNum);
  const totalRevenue = manualRevenue + tenantRevenue;

  const allExpenses = await db.select().from(expenses).where(eq(expenses.propertyId, propertyId));
  const yearlyExpenses = allExpenses.filter(e => e.date.startsWith(year));

  const manualInterests = yearlyExpenses.filter(e => e.type === 'interest').reduce((acc, e) => acc + centsToEuros(e.amount), 0);
  const repairs = yearlyExpenses.filter(e => e.type === 'repair').reduce((acc, e) => acc + centsToEuros(e.amount), 0);
  const manualOthers = yearlyExpenses.filter(e => e.type !== 'interest' && e.type !== 'repair').reduce((acc, e) => acc + centsToEuros(e.amount), 0);

  const propertyLoans = await db.select().from(loans).where(eq(loans.propertyId, propertyId));
  let loanInterests = 0;
  let loanPrincipals = 0;
  const loanBreakdown = propertyLoans.map(l => {
    const breakdown = calculateAnnualLoanPayments({
      principal: centsToEuros(l.principal),
      interestRate: l.interestRate,
      termYears: l.termYears,
      startDate: l.startDate,
      yearToQuery: queryYearNum,
      actualPayment: l.actualPayment ? centsToEuros(l.actualPayment) : undefined,
    });
    loanInterests += breakdown.annualInterest;
    loanPrincipals += breakdown.annualPrincipal;
    return {
      id: l.id,
      name: l.name,
      principal: centsToEuros(l.principal),
      interestRate: l.interestRate,
      termYears: l.termYears,
      startDate: l.startDate,
      annualInterestPaid: breakdown.annualInterest,
      annualPrincipalPaid: breakdown.annualPrincipal,
      annualTotalPaid: breakdown.annualTotalPayment,
    };
  });

  const propertyRecurringExpenses = await db.select().from(recurringExpenses).where(eq(recurringExpenses.propertyId, propertyId));
  let recurringTotal = 0;
  const recurringBreakdown = propertyRecurringExpenses.map(re => {
    const startYear = new Date(re.startDate).getFullYear();
    let annualCost = 0;
    if (startYear <= queryYearNum) {
      if (re.percentage !== null) {
        annualCost = (re.percentage / 100) * tenantRevenue;
      } else {
        const amountEuros = centsToEuros(re.amount);
        annualCost = re.frequency === 'monthly' ? amountEuros * 12 : amountEuros;
      }
    }
    recurringTotal += annualCost;
    return {
      id: re.id,
      name: re.name,
      type: re.type,
      amount: centsToEuros(re.amount),
      percentage: re.percentage ?? undefined,
      frequency: re.frequency,
      startDate: re.startDate,
      annualCost,
    };
  });

  const buildingValuePercentage = buildingValueEuros && purchasePriceEuros
    ? (buildingValueEuros / purchasePriceEuros)
    : 0.8;

  const amortization = calculateAnnualAmortization({
    purchasePrice: purchasePriceEuros,
    cadastralValue: cadastralValueEuros,
    buildingValuePercentage,
  });

  const totalInterests = manualInterests + loanInterests;
  const totalOthers = manualOthers + recurringTotal;

  const summary = calculateNetYield({
    totalRevenue,
    interests: totalInterests,
    repairs,
    otherDeductibleExpenses: totalOthers,
    amortization,
  });

  const manualTotalExpenses = yearlyExpenses.reduce((acc, e) => acc + centsToEuros(e.amount), 0);
  const totalCalculatedLoanOutflows = loanInterests + loanPrincipals;
  const totalCashOutflows = manualTotalExpenses + totalCalculatedLoanOutflows + recurringTotal;
  const netCashflow = totalRevenue - totalCashOutflows;

  return c.json({
    property: property.name,
    year,
    loans: loanBreakdown,
    recurringExpenses: recurringBreakdown,
    metrics: {
      totalRevenue,
      deductions: {
        interests: totalInterests,
        repairs,
        others: totalOthers,
        amortization,
      },
      ...summary,
      cashflow: {
        netCashflow,
        totalRevenue,
        totalCashOutflows,
        loanOutflows: totalCalculatedLoanOutflows,
        recurringOutflows: recurringTotal,
        manualOutflows: manualTotalExpenses,
      }
    }
  });
});

export default haciendaRoute;
