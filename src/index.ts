import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import * as dotenv from 'dotenv';
import { authMiddleware } from './middleware/auth.js';
import authRoute from './routes/auth.js';
import propertiesRoute from './routes/properties.js';
import revenuesRoute from './routes/revenues.js';
import expensesRoute from './routes/expenses.js';
import haciendaRoute from './routes/hacienda.js';
import globalHaciendaRoute from './routes/globalHacienda.js';
import tenantsRoute from './routes/tenants.js';
import loansRoute from './routes/loans.js';
import recurringExpensesRoute from './routes/recurringExpenses.js';

dotenv.config();

const app = new Hono();

app.use('*', cors());

export const errorHandler = (err: Error, c: Context) => {
  console.error('Unhandled error:', err);
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: 'Internal server error' }, 500);
};

// Global error handler
app.onError(errorHandler);

// Public routes (no auth required)
app.get('/', (c) => {
  return c.text('Housing Investment API is running!');
});
app.route('/auth', authRoute);

// Protected routes (auth required)
app.use('/properties/*', authMiddleware);
app.use('/revenues/*', authMiddleware);
app.use('/expenses/*', authMiddleware);
app.use('/hacienda/*', authMiddleware);
app.use('/hacienda-global/*', authMiddleware);
app.use('/tenants/*', authMiddleware);
app.use('/loans/*', authMiddleware);
app.use('/recurring-expenses/*', authMiddleware);

app.route('/properties', propertiesRoute);
app.route('/revenues', revenuesRoute);
app.route('/expenses', expensesRoute);
app.route('/hacienda', haciendaRoute);
app.route('/hacienda-global', globalHaciendaRoute);
app.route('/tenants', tenantsRoute);
app.route('/loans', loansRoute);
app.route('/recurring-expenses', recurringExpensesRoute);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
