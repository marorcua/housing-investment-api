import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createToken } from '../middleware/auth.js';

const loginSchema = z.object({
  password: z.string().min(1),
});

export function createAuthRoutes(jwtSecret: string, password: string): Hono {
  const router = new Hono();

  router.post('/login', zValidator('json', loginSchema), async (c) => {
    const { password: inputPassword } = c.req.valid('json');
    if (inputPassword !== password) {
      return c.json({ error: 'Invalid password' }, 401);
    }
    const token = await createToken(jwtSecret, 'admin');
    return c.json({ token });
  });

  return router;
}
