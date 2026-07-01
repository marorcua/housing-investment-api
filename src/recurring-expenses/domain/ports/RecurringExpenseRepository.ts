import { RecurringExpense } from '../entities/RecurringExpense.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export interface RecurringExpenseCreateInput {
  propertyId: number;
  name: string;
  type: string;
  amount?: Money;
  percentage?: number;
  frequency: string;
  startDate: string;
}

export interface RecurringExpenseRepository {
  findByPropertyId(propertyId: number): Promise<RecurringExpense[]>;
  create(input: RecurringExpenseCreateInput): Promise<RecurringExpense>;
  update(id: number, input: Partial<RecurringExpenseCreateInput>): Promise<RecurringExpense | null>;
  delete(id: number): Promise<boolean>;
}
