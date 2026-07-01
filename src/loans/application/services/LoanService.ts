import { LoanRepository, LoanCreateInput } from '../../domain/ports/LoanRepository.js';
import { Loan } from '../../domain/entities/Loan.js';

export class LoanService {
  constructor(private repo: LoanRepository) {}

  async listByProperty(propertyId: number): Promise<Loan[]> { return this.repo.findByPropertyId(propertyId); }
  async get(id: number): Promise<Loan | null> { return this.repo.findById(id); }
  async create(input: LoanCreateInput): Promise<Loan> { return this.repo.create(input); }
  async update(id: number, input: Partial<LoanCreateInput>): Promise<Loan | null> { return this.repo.update(id, input); }
  async delete(id: number): Promise<boolean> { return this.repo.delete(id); }
}
