import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { createToken } from '../middleware/auth.js';

const authRoute = new Hono();

const loginSchema = z.object({
  password: z.string().min(1),
});

authRoute.post('/login', zValidator('json', loginSchema), async (c) => {
  const { password } = c.req.valid('json');
  const expectedPassword = process.env.API_PASSWORD || 'admin';
  if (password !== expectedPassword) {
    return c.json({ error: 'Invalid password' }, 401);
  }
  const token = await createToken('admin');
  return c.json({ token });
});

export default authRoute;
