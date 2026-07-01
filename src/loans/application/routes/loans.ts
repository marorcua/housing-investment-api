import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { LoanService } from '../services/LoanService.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

const loanSchema = z.object({
  propertyId: z.number().int(),
  name: z.string().min(1),
  principal: z.number().positive(),
  interestRate: z.number().nonnegative(),
  termYears: z.number().int().positive(),
  startDate: z.string().regex(dateRegex),
  actualPayment: z.number().positive().optional().nullable(),
});

export function createLoansRoutes(service: LoanService): Hono {
  const router = new Hono();

  router.get('/property/:propertyId', async (c) => {
    const loans = await service.listByProperty(parseInt(c.req.param('propertyId')));
    return c.json(loans.map(formatLoan));
  });

  router.get('/:id', async (c) => {
    const loan = await service.get(parseInt(c.req.param('id')));
    if (!loan) return c.json({ error: 'Loan not found' }, 404);
    return c.json(formatLoan(loan));
  });

  router.post('/', zValidator('json', loanSchema), async (c) => {
    const data = c.req.valid('json');
    const loan = await service.create({
      propertyId: data.propertyId,
      name: data.name,
      principal: Money.fromEuros(data.principal),
      interestRate: data.interestRate,
      termYears: data.termYears,
      startDate: data.startDate,
      ...(data.actualPayment ? { actualPayment: Money.fromEuros(data.actualPayment) } : {}),
    });
    return c.json(formatLoan(loan), 201);
  });

  router.patch('/:id', zValidator('json', loanSchema.partial()), async (c) => {
    const id = parseInt(c.req.param('id'));
    const data = c.req.valid('json');
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = data.name;
    if (data.propertyId !== undefined) update.propertyId = data.propertyId;
    if (data.principal !== undefined) update.principal = Money.fromEuros(data.principal);
    if (data.interestRate !== undefined) update.interestRate = data.interestRate;
    if (data.termYears !== undefined) update.termYears = data.termYears;
    if (data.startDate !== undefined) update.startDate = data.startDate;
    if (data.actualPayment !== undefined) update.actualPayment = data.actualPayment ? Money.fromEuros(data.actualPayment) : null;
    const loan = await service.update(id, update as any);
    if (!loan) return c.json({ error: 'Loan not found' }, 404);
    return c.json(formatLoan(loan));
  });

  router.delete('/:id', async (c) => {
    const ok = await service.delete(parseInt(c.req.param('id')));
    if (!ok) return c.json({ error: 'Loan not found' }, 404);
    return c.json({ message: 'Loan deleted' });
  });

  return router;
}

function formatLoan(l: import('../../domain/entities/Loan.js').Loan) {
  return {
    id: l.id,
    propertyId: l.propertyId,
    name: l.name,
    principal: l.principal.toEuros(),
    interestRate: l.interestRate,
    termYears: l.termYears,
    startDate: l.startDate,
    actualPayment: l.actualPayment?.toEuros() ?? undefined,
  };
}
