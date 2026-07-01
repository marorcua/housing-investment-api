import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import * as dotenv from 'dotenv';
import { createAuthMiddleware } from './auth/application/middleware/auth.js';
import { createAuthRoutes } from './auth/application/routes/auth.js';
import { createPropertiesRoutes } from './properties/application/routes/properties.js';
import { createRevenuesRoutes } from './revenues/application/routes/revenues.js';
import { createExpensesRoutes } from './expenses/application/routes/expenses.js';
import { createTenantsRoutes } from './tenants/application/routes/tenants.js';
import { createLoansRoutes } from './loans/application/routes/loans.js';
import { createRecurringExpensesRoutes } from './recurring-expenses/application/routes/recurring-expenses.js';
import { createHaciendaRoutes } from './hacienda/application/routes/hacienda.js';
import { createGlobalHaciendaRoutes } from './hacienda/application/routes/global-hacienda.js';
import { startDailyBackup } from './shared/infrastructure/scheduler.js';
import { PropertyService } from './properties/application/services/PropertyService.js';
import { DrizzlePropertyRepository } from './properties/infrastructure/repositories/DrizzlePropertyRepository.js';
import { RevenueService } from './revenues/application/services/RevenueService.js';
import { DrizzleRevenueRepository } from './revenues/infrastructure/repositories/DrizzleRevenueRepository.js';
import { ExpenseService } from './expenses/application/services/ExpenseService.js';
import { DrizzleExpenseRepository } from './expenses/infrastructure/repositories/DrizzleExpenseRepository.js';
import { TenantService } from './tenants/application/services/TenantService.js';
import { DrizzleTenantRepository, DrizzleRentIncreaseRepository } from './tenants/infrastructure/repositories/DrizzleTenantRepository.js';
import { LoanService } from './loans/application/services/LoanService.js';
import { DrizzleLoanRepository } from './loans/infrastructure/repositories/DrizzleLoanRepository.js';
import { RecurringExpenseService } from './recurring-expenses/application/services/RecurringExpenseService.js';
import { DrizzleRecurringExpenseRepository } from './recurring-expenses/infrastructure/repositories/DrizzleRecurringExpenseRepository.js';
import { HaciendaService } from './hacienda/application/services/HaciendaService.js';
import { DrizzleHaciendaQuery } from './hacienda/infrastructure/repositories/DrizzleHaciendaQuery.js';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const apiPassword = process.env.API_PASSWORD || 'admin';

const propertyService = new PropertyService(new DrizzlePropertyRepository());
const revenueService = new RevenueService(new DrizzleRevenueRepository());
const expenseService = new ExpenseService(new DrizzleExpenseRepository());
const tenantService = new TenantService(new DrizzleTenantRepository(), new DrizzleRentIncreaseRepository());
const loanService = new LoanService(new DrizzleLoanRepository());
const recurringExpenseService = new RecurringExpenseService(new DrizzleRecurringExpenseRepository());
const haciendaService = new HaciendaService(new DrizzleHaciendaQuery());

const authMiddleware = createAuthMiddleware(jwtSecret);

const app = new Hono();

app.use('*', cors());

export const errorHandler = (err: Error, c: Context) => {
  console.error('Unhandled error:', err);
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: 'Internal server error' }, 500);
};

app.onError(errorHandler);

app.get('/', (c) => {
  return c.text('Housing Investment API is running!');
});
app.route('/auth', createAuthRoutes(jwtSecret, apiPassword));

app.use('/properties/*', authMiddleware);
app.use('/revenues/*', authMiddleware);
app.use('/expenses/*', authMiddleware);
app.use('/hacienda/*', authMiddleware);
app.use('/hacienda-global/*', authMiddleware);
app.use('/tenants/*', authMiddleware);
app.use('/loans/*', authMiddleware);
app.use('/recurring-expenses/*', authMiddleware);

app.route('/properties', createPropertiesRoutes(propertyService));
app.route('/revenues', createRevenuesRoutes(revenueService));
app.route('/expenses', createExpensesRoutes(expenseService));
app.route('/hacienda', createHaciendaRoutes(haciendaService));
app.route('/hacienda-global', createGlobalHaciendaRoutes(haciendaService));
app.route('/tenants', createTenantsRoutes(tenantService));
app.route('/loans', createLoansRoutes(loanService));
app.route('/recurring-expenses', createRecurringExpensesRoutes(recurringExpenseService));

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

startDailyBackup();

export default app;
