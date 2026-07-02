import { LoanService } from './application/services/LoanService.js';
import { DrizzleLoanRepository } from './infrastructure/repositories/DrizzleLoanRepository.js';
import { createLoansRoutes } from './application/routes/loans.js';

export function createLoansModule() {
  return createLoansRoutes(new LoanService(new DrizzleLoanRepository()));
}
