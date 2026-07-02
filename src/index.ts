import { serve } from '@hono/node-server';
import * as dotenv from 'dotenv';
import { createApp, errorHandler } from './routes.js';
import { startDailyBackup } from './shared/infrastructure/scheduler.js';

dotenv.config();

const jwtSecret = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const apiPassword = process.env.API_PASSWORD || 'admin';

const app = createApp(jwtSecret, apiPassword);
app.onError(errorHandler);

const port = process.env.PORT ? parseInt(process.env.PORT) : 3000;
console.log(`Server is running on port ${port}`);

serve({ fetch: app.fetch, port });

startDailyBackup();

export default app;
export { errorHandler };
