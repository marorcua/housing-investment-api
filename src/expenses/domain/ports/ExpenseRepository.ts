import { Expense } from '../entities/Expense.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export interface ExpenseCreateInput {
  propertyId: number;
  amount: Money;
  type: string;
  date: string;
  description?: string;
}

export interface ExpenseRepository {
  findByPropertyId(propertyId: number): Promise<Expense[]>;
  create(input: ExpenseCreateInput): Promise<Expense>;
  update(id: number, input: Partial<ExpenseCreateInput>): Promise<Expense | null>;
  delete(id: number): Promise<boolean>;
}
