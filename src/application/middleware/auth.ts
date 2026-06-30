import { createMiddleware } from 'hono/factory';
import { jwtVerify, SignJWT } from 'jose';
import type { Context, Next } from 'hono';

const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret-change-in-production');
const JWT_ISSUER = 'housing-investment-api';

export const authMiddleware = createMiddleware(async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  try {
    const token = authHeader.slice(7);
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: JWT_ISSUER });
    c.set('userId', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }
});

export const createToken = async (userId: string): Promise<string> => {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(JWT_ISSUER)
    .setExpirationTime('24h')
    .setIssuedAt()
    .sign(JWT_SECRET);
};
