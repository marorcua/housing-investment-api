import { RecurringExpenseRepository, RecurringExpenseCreateInput } from '../../domain/ports/RecurringExpenseRepository.js';
import { RecurringExpense } from '../../domain/entities/RecurringExpense.js';

export class RecurringExpenseService {
  constructor(private repo: RecurringExpenseRepository) {}

  async listByProperty(propertyId: number): Promise<RecurringExpense[]> { return this.repo.findByPropertyId(propertyId); }
  async create(input: RecurringExpenseCreateInput): Promise<RecurringExpense> { return this.repo.create(input); }
  async update(id: number, input: Partial<RecurringExpenseCreateInput>): Promise<RecurringExpense | null> { return this.repo.update(id, input); }
  async delete(id: number): Promise<boolean> { return this.repo.delete(id); }
}
