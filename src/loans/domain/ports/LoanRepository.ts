import { Loan } from '../entities/Loan.js';
import { Money } from '../../../shared/domain/valueObjects/Money.js';

export interface LoanCreateInput {
  propertyId: number;
  name: string;
  principal: Money;
  interestRate: number;
  termYears: number;
  startDate: string;
  actualPayment?: Money;
}

export interface LoanRepository {
  findByPropertyId(propertyId: number): Promise<Loan[]>;
  findById(id: number): Promise<Loan | null>;
  create(input: LoanCreateInput): Promise<Loan>;
  update(id: number, input: Partial<LoanCreateInput>): Promise<Loan | null>;
  delete(id: number): Promise<boolean>;
}
