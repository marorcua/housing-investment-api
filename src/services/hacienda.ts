/**
 * Hacienda Service
 * 
 * Logic for Spanish tax compliance (IRPF) regarding real estate investments.
 */

interface AmortizationInput {
  purchasePrice: number;
  cadastralValue: number;
  buildingValuePercentage: number; // e.g., 0.7 if building is 70% of total value
}

/**
 * Calculates the annual amortization (3% rule).
 * Hacienda allows deducting 3% of the higher of:
 * - Purchase price (excluding land value)
 * - Cadastral value (excluding land value)
 */
export const calculateAnnualAmortization = (input: AmortizationInput): number => {
  const higherValue = Math.max(input.purchasePrice, input.cadastralValue);
  const buildingValue = higherValue * input.buildingValuePercentage;
  return buildingValue * 0.03;
};

interface NetYieldInput {
  totalRevenue: number;
  interests: number;
  repairs: number;
  otherDeductibleExpenses: number; // IBI, Community, Insurance, etc.
  amortization: number;
}

/**
 * Calculates the Net Yield (Rendimiento Neto).
 * 
 * Note: Interests + Repairs cannot exceed total revenue. 
 * Any excess can be carried forward for 4 years (not handled here for simplicity).
 */
export const calculateNetYield = (input: NetYieldInput) => {
  const cappedExpenses = Math.min(input.interests + input.repairs, input.totalRevenue);
  
  const totalDeductions = cappedExpenses + input.otherDeductibleExpenses + input.amortization;
  const netYield = input.totalRevenue - totalDeductions;
  
  return {
    netYield,
    totalDeductions,
    isCapped: (input.interests + input.repairs) > input.totalRevenue,
    excessToCarryForward: Math.max(0, (input.interests + input.repairs) - input.totalRevenue),
  };
};

/**
 * Calculates the monthly loan payment using the French amortization system.
 */
export const calculateMonthlyPayment = (principal: number, annualInterestRate: number, years: number): number => {
  if (annualInterestRate === 0) return principal / (years * 12);
  
  const monthlyRate = annualInterestRate / 100 / 12;
  const totalMonths = years * 12;
  
  const payment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  
  return payment;
};

export interface LoanBreakdownInput {
  principal: number;
  interestRate: number;
  termYears: number;
  startDate: string; // YYYY-MM-DD
  yearToQuery: number;
}

export const calculateAnnualLoanPayments = (input: LoanBreakdownInput) => {
  const { principal, interestRate, termYears, startDate, yearToQuery } = input;
  
  const start = new Date(startDate);
  const startYear = start.getFullYear();
  const startMonth = start.getMonth();
  
  const monthlyRate = interestRate / 100 / 12;
  const totalMonths = termYears * 12;
  
  let monthlyPayment = 0;
  if (interestRate === 0) {
    monthlyPayment = principal / totalMonths;
  } else {
    monthlyPayment = principal * (monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  }
  
  let remainingBalance = principal;
  let annualInterest = 0;
  let annualPrincipal = 0;
  
  for (let m = 0; m < totalMonths; m++) {
    const interestForMonth = remainingBalance * monthlyRate;
    const principalForMonth = monthlyPayment - interestForMonth;
    
    const currentMonthTotal = startMonth + m;
    const currentYear = startYear + Math.floor(currentMonthTotal / 12);
    
    if (currentYear === yearToQuery) {
      annualInterest += interestForMonth;
      annualPrincipal += principalForMonth;
    }
    
    remainingBalance -= principalForMonth;
    if (remainingBalance < 0) remainingBalance = 0;
  }
  
  return {
    annualInterest,
    annualPrincipal,
    annualTotalPayment: annualInterest + annualPrincipal,
  };
};

export interface RentIncreaseInfo {
  yearOffset: number;
  percentage: number;
  applied: boolean;
}

export interface TenantForRevenue {
  id: number;
  name: string;
  monthlyRent: number;
  startDate: string; // YYYY-MM-DD
  endDate: string | null;  // YYYY-MM-DD or null (ongoing)
  rentIncreases?: RentIncreaseInfo[];
}

/**
 * Computes the escalated monthly rent for a tenant in a given target year,
 * compounding all granted increases whose year_offset has been reached.
 */
export const computeEscalatedRent = (
  baseRent: number,
  startDate: string,
  targetYear: number,
  increases: RentIncreaseInfo[]
): number => {
  const startYear = new Date(startDate).getFullYear();
  const yearsSinceStart = targetYear - startYear;
  let multiplier = 1;
  for (const inc of increases) {
    if (inc.applied && inc.yearOffset <= yearsSinceStart) {
      multiplier *= (1 + inc.percentage / 100);
    }
  }
  return baseRent * multiplier;
};

/**
 * Pro-rates a tenant's monthly rent to the exact days they were active
 * within a given calendar month.
 * Returns the revenue amount and how many days were active.
 */
const parseLocalDate = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
};

export const getTenantRevenueForMonth = (
  tenant: TenantForRevenue,
  year: number,
  month: number
): { revenue: number; activeDays: number; totalDays: number } => {
  const totalDays = new Date(year, month, 0).getDate();

  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, totalDays);

  const contractStart = parseLocalDate(tenant.startDate);
  const contractEnd = tenant.endDate ? parseLocalDate(tenant.endDate) : null;

  const overlapStart = contractStart > monthStart ? contractStart : monthStart;
  const overlapEnd = contractEnd && contractEnd < monthEnd ? contractEnd : monthEnd;

  if (overlapStart > overlapEnd) return { revenue: 0, activeDays: 0, totalDays };

  const activeDays = overlapEnd.getDate() - overlapStart.getDate() + 1;
  const escalated = computeEscalatedRent(
    tenant.monthlyRent,
    tenant.startDate,
    year,
    tenant.rentIncreases || []
  );
  const revenue = (escalated / totalDays) * activeDays;

  return { revenue, activeDays, totalDays };
};

/**
 * Calculates the total tenant-derived revenue for a full year,
 * iterating over each month and each tenant.
 */
export const calculateAnnualTenantRevenue = (
  tenants: TenantForRevenue[],
  year: number
): number => {
  let total = 0;
  for (let month = 1; month <= 12; month++) {
    for (const tenant of tenants) {
      total += getTenantRevenueForMonth(tenant, year, month).revenue;
    }
  }
  return total;
};
