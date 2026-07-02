import { Hono } from 'hono';
import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { createAuthMiddleware } from './auth/application/middleware/auth.js';
import { createAuthRoutes } from './auth/application/routes/auth.js';
import { createPropertiesModule } from './properties/index.js';
import { createTenantsModule } from './tenants/index.js';
import { createRevenuesModule } from './revenues/index.js';
import { createExpensesModule } from './expenses/index.js';
import { createLoansModule } from './loans/index.js';
import { createRecurringExpensesModule } from './recurring-expenses/index.js';
import { createHaciendaModules } from './hacienda/index.js';

export const errorHandler = (err: Error, c: Context) => {
  console.error('Unhandled error:', err);
  if (err instanceof HTTPException) {
    return c.json({ error: err.message }, err.status);
  }
  return c.json({ error: 'Internal server error' }, 500);
};

export function createApp(jwtSecret: string, apiPassword: string): Hono {
  const authMiddleware = createAuthMiddleware(jwtSecret);
  const app = new Hono();

  app.use('*', cors());
  app.get('/', (c) => c.text('Housing Investment API is running!'));
  app.route('/auth', createAuthRoutes(jwtSecret, apiPassword));

  const protectedRoutes = [
    { prefix: '/properties', factory: createPropertiesModule },
    { prefix: '/tenants', factory: createTenantsModule },
    { prefix: '/revenues', factory: createRevenuesModule },
    { prefix: '/expenses', factory: createExpensesModule },
    { prefix: '/loans', factory: createLoansModule },
    { prefix: '/recurring-expenses', factory: createRecurringExpensesModule },
  ];

  for (const { prefix, factory } of protectedRoutes) {
    app.use(`${prefix}/*`, authMiddleware);
    app.route(prefix, factory());
  }

  const { hacienda, globalHacienda } = createHaciendaModules();
  app.use('/hacienda/*', authMiddleware);
  app.route('/hacienda', hacienda);
  app.use('/hacienda-global/*', authMiddleware);
  app.route('/hacienda-global', globalHacienda);

  return app;
}
