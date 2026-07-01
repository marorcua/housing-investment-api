import { ExpenseRepository, ExpenseCreateInput } from '../../domain/ports/ExpenseRepository.js';
import { Expense } from '../../domain/entities/Expense.js';

export class ExpenseService {
  constructor(private repo: ExpenseRepository) {}

  async listByProperty(propertyId: number): Promise<Expense[]> { return this.repo.findByPropertyId(propertyId); }
  async create(input: ExpenseCreateInput): Promise<Expense> { return this.repo.create(input); }
  async update(id: number, input: Partial<ExpenseCreateInput>): Promise<Expense | null> { return this.repo.update(id, input); }
  async delete(id: number): Promise<boolean> { return this.repo.delete(id); }
}
