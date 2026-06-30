import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import authRoute from '../../../src/application/routes/auth.js';

describe('POST /auth/login', () => {
  beforeAll(() => {
    process.env.API_PASSWORD = 'test-password';
  });

  it('returns a token with correct password', async () => {
    const app = new Hono().route('/auth', authRoute);
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'test-password' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
    expect(typeof body.token).toBe('string');
  });

  it('rejects wrong password with 401', async () => {
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
    const app = new Hono().route('/auth', authRoute);
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: '' }),
    });
    expect(res.status).toBe(400);
  });

  it('rejects missing password field', async () => {
    const app = new Hono().route('/auth', authRoute);
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('uses default password when API_PASSWORD is not set', async () => {
    delete process.env.API_PASSWORD;
    const app = new Hono().route('/auth', authRoute);
    const res = await app.request('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: 'admin' }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toHaveProperty('token');
  });
});
