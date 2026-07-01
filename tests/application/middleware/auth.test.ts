import { describe, it, expect, beforeAll } from 'vitest';
import { Hono } from 'hono';
import { jwtVerify } from 'jose';
import { createAuthMiddleware, createToken } from '../../../src/auth/application/middleware/auth.js';

const JWT_SECRET = 'test-secret';
const JWT_ISSUER = 'housing-investment-api';

describe('createToken', () => {
  it('returns a string token', async () => {
    const token = await createToken(JWT_SECRET, 'test-user');
    expect(typeof token).toBe('string');
    expect(token.split('.')).toHaveLength(3); // JWT has 3 parts
  });

  it('produces a verifiable token with correct payload', async () => {
    const token = await createToken(JWT_SECRET, 'user-42');
    const secret = new TextEncoder().encode(JWT_SECRET);
    const { payload } = await jwtVerify(token, secret, { issuer: JWT_ISSUER });
    expect(payload.sub).toBe('user-42');
  });

  it('contains correct issuer and algorithm', async () => {
    const token = await createToken(JWT_SECRET, 'user');
    const header = JSON.parse(atob(token.split('.')[0]));
    expect(header.alg).toBe('HS256');
    const payload = JSON.parse(atob(token.split('.')[1]));
    expect(payload.iss).toBe('housing-investment-api');
    expect(payload.sub).toBe('user');
    expect(payload.exp).toBeGreaterThan(payload.iat!);
  });
});

describe('authMiddleware', () => {
  let app: Hono;

  beforeAll(() => {
    app = new Hono();
    const authMiddleware = createAuthMiddleware(JWT_SECRET);
    app.get('/protected', authMiddleware, (c) => c.json({ ok: true }));
    app.get('/public', (c) => c.json({ ok: true }));
  });

  it('allows requests with valid token', async () => {
    const token = await createToken(JWT_SECRET, 'test');
    const res = await app.request('/protected', {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it('rejects requests without Authorization header', async () => {
    const res = await app.request('/protected');
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Unauthorized');
  });

  it('rejects requests with malformed Authorization header', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Basic token' },
    });
    expect(res.status).toBe(401);
  });

  it('rejects requests with invalid token', async () => {
    const res = await app.request('/protected', {
      headers: { Authorization: 'Bearer invalid-token' },
    });
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toBe('Invalid or expired token');
  });

  it('allows public routes without token', async () => {
    const res = await app.request('/public');
    expect(res.status).toBe(200);
  });
});
