import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import * as schema from './schema.js';
import * as dotenv from 'dotenv';
dotenv.config();

const client = createClient({
  url: process.env.TURSO_CONNECTION_URL || 'file:local.db',
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// Enable foreign key enforcement (SQLite requires this at runtime)
client.execute('PRAGMA foreign_keys = ON').catch(() => {});

export const db = drizzle(client, { schema });
