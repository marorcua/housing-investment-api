import { calculateAnnualAmortization, calculateNetYield, calculateMonthlyPayment, calculateAnnualLoanPayments, calculateAnnualTenantRevenue, getTenantRevenueForMonth } from '../../domain/HaciendaCalculator.js';
import type { TenantForRevenue } from '../../domain/HaciendaCalculator.js';

export interface QueryData {
  getProperty(id: number): Promise<any>;
  getRevenuesByProperty(id: number): Promise<any[]>;
  getExpensesByProperty(id: number): Promise<any[]>;
  getTenantsByProperty(id: number): Promise<any[]>;
  getLoansByProperty(id: number): Promise<any[]>;
  getRecurringExpensesByProperty(id: number): Promise<any[]>;
  getAllProperties(): Promise<any[]>;
  getAllTenants(): Promise<any[]>;
  getAllLoans(): Promise<any[]>;
  getAllRecurringExpenses(): Promise<any[]>;
  getAllRevenues(): Promise<any[]>;
  getAllExpenses(): Promise<any[]>;
}

export class HaciendaService {
  constructor(private data: QueryData) {}

  async getSummary(propertyId: number, year?: string) {
    const yearStr = year || new Date().getFullYear().toString();
    const queryYearNum = parseInt(yearStr);

    const property = await this.data.getProperty(propertyId);
    if (!property) throw new Error('Property not found');

    const purchasePriceEuros = property.purchasePrice;
    const cadastralValueEuros = property.cadastralValue || 0;
    const buildingValueEuros = property.buildingValue || 0;

    const allRevenues = await this.data.getRevenuesByProperty(propertyId);
    const yearlyRevenues = allRevenues.filter((r: any) => r.date.startsWith(yearStr));
    const manualRevenue = yearlyRevenues.reduce((acc: number, r: any) => acc + r.amount, 0);

    const propertyTenants = await this.data.getTenantsByProperty(propertyId);
    const tenantRevenueInputs: TenantForRevenue[] = propertyTenants.map((t: any) => ({
      id: t.id,
      name: t.name,
      monthlyRent: t.monthlyRent,
      startDate: t.startDate,
      endDate: t.endDate,
      rentIncreases: (t.rentIncreases || []).map((i: any) => ({
        yearOffset: i.yearOffset,
        percentage: i.percentage,
        applied: i.applied,
      })),
    }));
    const tenantRevenue = calculateAnnualTenantRevenue(tenantRevenueInputs, queryYearNum);
    const totalRevenue = manualRevenue + tenantRevenue;

    const allExpenses = await this.data.getExpensesByProperty(propertyId);
    const yearlyExpenses = allExpenses.filter((e: any) => e.date.startsWith(yearStr));

    const manualInterests = yearlyExpenses.filter((e: any) => e.type === 'interest').reduce((acc: number, e: any) => acc + e.amount, 0);
    const repairs = yearlyExpenses.filter((e: any) => e.type === 'repair').reduce((acc: number, e: any) => acc + e.amount, 0);
    const manualOthers = yearlyExpenses.filter((e: any) => e.type !== 'interest' && e.type !== 'repair').reduce((acc: number, e: any) => acc + e.amount, 0);

    const propertyLoans = await this.data.getLoansByProperty(propertyId);
    let loanInterests = 0;
    let loanPrincipals = 0;
    const loanBreakdown = propertyLoans.map((l: any) => {
      const breakdown = calculateAnnualLoanPayments({
        principal: l.principal,
        interestRate: l.interestRate,
        termYears: l.termYears,
        startDate: l.startDate,
        yearToQuery: queryYearNum,
        actualPayment: l.actualPayment ?? undefined,
      });
      loanInterests += breakdown.annualInterest;
      loanPrincipals += breakdown.annualPrincipal;
      return {
        id: l.id,
        name: l.name,
        principal: l.principal,
        interestRate: l.interestRate,
        termYears: l.termYears,
        startDate: l.startDate,
        annualInterestPaid: breakdown.annualInterest,
        annualPrincipalPaid: breakdown.annualPrincipal,
        annualTotalPaid: breakdown.annualTotalPayment,
      };
    });

    const propertyRecurringExpenses = await this.data.getRecurringExpensesByProperty(propertyId);
    let recurringTotal = 0;
    const recurringBreakdown = propertyRecurringExpenses.map((re: any) => {
      const startYear = new Date(re.startDate).getFullYear();
      let annualCost = 0;
      if (startYear <= queryYearNum) {
        if (re.percentage !== null) {
          annualCost = (re.percentage / 100) * tenantRevenue;
        } else {
          annualCost = re.frequency === 'monthly' ? re.amount * 12 : re.amount;
        }
      }
      recurringTotal += annualCost;
      return {
        id: re.id,
        name: re.name,
        type: re.type,
        amount: re.amount,
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

    const manualTotalExpenses = yearlyExpenses.reduce((acc: number, e: any) => acc + e.amount, 0);
    const totalCalculatedLoanOutflows = loanInterests + loanPrincipals;
    const totalCashOutflows = manualTotalExpenses + totalCalculatedLoanOutflows + recurringTotal;
    const netCashflow = totalRevenue - totalCashOutflows;

    return {
      property: property.name,
      year: yearStr,
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
        },
      },
    };
  }

  async getGlobal(year?: string) {
    const queryYear = year ? parseInt(year) : new Date().getFullYear();

    const [allProperties, allTenants, allLoans, allRecurring, allRevenues, allExpenses] = await Promise.all([
      this.data.getAllProperties(),
      this.data.getAllTenants(),
      this.data.getAllLoans(),
      this.data.getAllRecurringExpenses(),
      this.data.getAllRevenues(),
      this.data.getAllExpenses(),
    ]);

    const increaseMap = new Map<number, { yearOffset: number; percentage: number; applied: boolean }[]>();
    for (const t of allTenants) {
      if (t.rentIncreases && t.rentIncreases.length > 0) {
        increaseMap.set(t.id, t.rentIncreases.map((i: any) => ({
          yearOffset: i.yearOffset,
          percentage: i.percentage,
          applied: i.applied,
        })));
      }
    }

    const propData = allProperties.map(prop => ({
      id: prop.id,
      tenants: allTenants.filter((t: any) => t.propertyId === prop.id).map((t: any) => ({
        ...t,
        rentIncreases: increaseMap.get(t.id) || [],
      })),
      loans: allLoans.filter((l: any) => l.propertyId === prop.id),
      recurringExpenses: allRecurring.filter((r: any) => r.propertyId === prop.id),
      revenues: allRevenues.filter((r: any) => r.propertyId === prop.id),
      expenses: allExpenses.filter((e: any) => e.propertyId === prop.id),
    }));

    const minYear = Math.min(
      ...propData.flatMap((p: any) => [
        ...p.tenants.map((t: any) => new Date(t.startDate).getFullYear()),
        ...p.loans.map((l: any) => new Date(l.startDate).getFullYear()),
        ...p.recurringExpenses.map((r: any) => new Date(r.startDate).getFullYear()),
        ...p.revenues.map((r: any) => new Date(r.date).getFullYear()),
      ]),
      2023,
    );
    const maxYear = Math.max(queryYear, new Date().getFullYear());

    const annual: { year: number; revenue: number; expenses: number; net: number }[] = [];
    for (let year = minYear; year <= maxYear; year++) {
      let totalRevenue = 0;
      let totalExpenses = 0;

      for (const pd of propData) {
        const tenantInputs: TenantForRevenue[] = pd.tenants.map((t: any) => ({
          id: t.id,
          name: t.name,
          monthlyRent: t.monthlyRent,
          startDate: t.startDate,
          endDate: t.endDate,
          rentIncreases: t.rentIncreases,
        }));
        const annualTenantRevenue = calculateAnnualTenantRevenue(tenantInputs, year);
        totalRevenue += annualTenantRevenue;

        const yearlyRevenues = pd.revenues.filter((r: any) => r.date.startsWith(year.toString()));
        totalRevenue += yearlyRevenues.reduce((acc: number, r: any) => acc + r.amount, 0);

        let propExpenses = 0;

        const yearlyExpenses = pd.expenses.filter((e: any) => e.date.startsWith(year.toString()));
        propExpenses += yearlyExpenses.reduce((acc: number, e: any) => acc + e.amount, 0);

        for (const loan of pd.loans) {
          const breakdown = calculateAnnualLoanPayments({
            principal: loan.principal,
            interestRate: loan.interestRate,
            termYears: loan.termYears,
            startDate: loan.startDate,
            yearToQuery: year,
            actualPayment: loan.actualPayment ?? undefined,
          });
          propExpenses += breakdown.annualTotalPayment;
        }

        for (const re of pd.recurringExpenses) {
          const startYear = new Date(re.startDate).getFullYear();
          if (startYear <= year) {
            if (re.percentage !== null) {
              propExpenses += (re.percentage / 100) * annualTenantRevenue;
            } else {
              propExpenses += re.frequency === 'monthly' ? re.amount * 12 : re.amount;
            }
          }
        }

        totalExpenses += propExpenses;
      }

      annual.push({
        year,
        revenue: Math.round(totalRevenue * 100) / 100,
        expenses: Math.round(totalExpenses * 100) / 100,
        net: Math.round((totalRevenue - totalExpenses) * 100) / 100,
      });
    }

    const monthly: { month: number; revenue: number; expenses: number; net: number }[] = [];
    for (let month = 1; month <= 12; month++) {
      let monthRev = 0;
      let monthExp = 0;

      for (const pd of propData) {
        const tenantInputs: TenantForRevenue[] = pd.tenants.map((t: any) => ({
          id: t.id,
          name: t.name,
          monthlyRent: t.monthlyRent,
          startDate: t.startDate,
          endDate: t.endDate,
          rentIncreases: t.rentIncreases,
        }));
        let tenantRev = 0;
        for (const t of tenantInputs) {
          const tr = getTenantRevenueForMonth(t, queryYear, month);
          tenantRev += tr.revenue;
          monthRev += tr.revenue;
        }

        const mPrefix = `${queryYear}-${String(month).padStart(2, '0')}`;
        const monthRevenues = pd.revenues.filter((r: any) => r.date.startsWith(mPrefix));
        monthRev += monthRevenues.reduce((acc: number, r: any) => acc + r.amount, 0);

        let monthExpTotal = 0;

        const monthExpenses = pd.expenses.filter((e: any) => e.date.startsWith(mPrefix));
        monthExpTotal += monthExpenses.reduce((acc: number, e: any) => acc + e.amount, 0);

        for (const loan of pd.loans) {
          const start = new Date(loan.startDate);
          const sYear = start.getFullYear();
          const sMonth = start.getMonth() + 1;
          const elapsedMonths = (queryYear - sYear) * 12 + (month - sMonth);
          const totalLoanMonths = loan.termYears * 12;
          if (elapsedMonths >= 0 && elapsedMonths < totalLoanMonths) {
            const payment = loan.actualPayment
              ?? calculateMonthlyPayment(loan.principal, loan.interestRate, loan.termYears);
            monthExpTotal += payment;
          }
        }

        for (const re of pd.recurringExpenses) {
          const start = new Date(re.startDate);
          const sYear = start.getFullYear();
          const sMonth = start.getMonth() + 1;
          if (queryYear > sYear || (queryYear === sYear && month >= sMonth)) {
            const monthlyAmt = re.percentage !== null
              ? (re.percentage / 100) * tenantRev
              : re.amount;
            if (re.frequency === 'monthly') {
              monthExpTotal += monthlyAmt;
            } else if (re.frequency === 'annual' && month === sMonth) {
              monthExpTotal += monthlyAmt;
            }
          }
        }

        monthExp += monthExpTotal;
      }

      monthly.push({
        month,
        revenue: Math.round(monthRev * 100) / 100,
        expenses: Math.round(monthExp * 100) / 100,
        net: Math.round((monthRev - monthExp) * 100) / 100,
      });
    }

    return { annual, monthly, currentYear: queryYear };
  }
}
