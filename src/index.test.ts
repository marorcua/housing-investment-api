import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

const mockChain = vi.hoisted(() => {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(),
    then: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.returning.mockReturnValue(chain);
  chain.then.mockImplementation((resolve: any) => Promise.resolve([]).then(resolve));
  return chain;
});

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => mockChain),
  insert: vi.fn(() => mockChain),
  update: vi.fn(() => mockChain),
  delete: vi.fn(() => mockChain),
}));

vi.mock('./db/index.js', () => ({ db: mockDb }));

vi.mock('@hono/node-server', () => ({ serve: vi.fn() }));

import app, { errorHandler } from './index.js';

describe('app index', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('GET / — returns welcome text', async () => {
    const res = await app.request('/');
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('Housing Investment API');
  });

  it('cors headers are set', async () => {
    const res = await app.request('/');
    expect(res.headers.get('access-control-allow-origin')).toBe('*');
  });

  it('returns 404 for unknown routes', async () => {
    const res = await app.request('/nonexistent');
    expect(res.status).toBe(404);
  });

  it('error handler catches HTTPException', async () => {
    const testApp = new Hono();
    testApp.onError(errorHandler);
    testApp.get('/http-boom', () => { throw new HTTPException(400, { message: 'Bad request' }); });
    const res = await testApp.request('/http-boom');
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: 'Bad request' });
  });

  it('error handler catches generic Error', async () => {
    const testApp = new Hono();
    testApp.onError(errorHandler);
    testApp.get('/generic-boom', () => { throw new Error('Kaboom'); });
    const res = await testApp.request('/generic-boom');
    expect(res.status).toBe(500);
    expect(await res.json()).toEqual({ error: 'Internal server error' });
  });
});
