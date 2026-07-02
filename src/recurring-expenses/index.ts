import { RecurringExpenseService } from './application/services/RecurringExpenseService.js';
import { DrizzleRecurringExpenseRepository } from './infrastructure/repositories/DrizzleRecurringExpenseRepository.js';
import { createRecurringExpensesRoutes } from './application/routes/recurring-expenses.js';

export function createRecurringExpensesModule() {
  return createRecurringExpensesRoutes(new RecurringExpenseService(new DrizzleRecurringExpenseRepository()));
}
