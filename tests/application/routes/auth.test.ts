import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { createAuthRoutes } from '../../../src/auth/application/routes/auth.js';

const JWT_SECRET = 'test-secret';
const API_PASSWORD = 'test-password';

describe('POST /auth/login', () => {
  it('returns a token with correct password', async () => {
    const authRoute = createAuthRoutes(JWT_SECRET, API_PASSWORD);
    const app = new Hono().route('/auth', authRoute);
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: API_PASSWORD }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
  });

  it('rejects wrong password with 401', async () => {
    const authRoute = createAuthRoutes(JWT_SECRET, API_PASSWORD);
    const app = new Hono().route('/auth', authRoute);
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'wrong' }),
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid password');
  });

  it('rejects empty password with 400', async () => {
    const authRoute = createAuthRoutes(JWT_SECRET, API_PASSWORD);
    const app = new Hono().route('/auth', authRoute);
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing password field', async () => {
    const authRoute = createAuthRoutes(JWT_SECRET, API_PASSWORD);
    const app = new Hono().route('/auth', authRoute);
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });
});
