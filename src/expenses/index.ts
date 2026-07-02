import { ExpenseService } from './application/services/ExpenseService.js';
import { DrizzleExpenseRepository } from './infrastructure/repositories/DrizzleExpenseRepository.js';
import { createExpensesRoutes } from './application/routes/expenses.js';

export function createExpensesModule() {
  return createExpensesRoutes(new ExpenseService(new DrizzleExpenseRepository()));
}
