import { RevenueRepository, RevenueCreateInput } from '../../domain/ports/RevenueRepository.js';
import { Revenue } from '../../domain/entities/Revenue.js';

export class RevenueService {
  constructor(private repo: RevenueRepository) {}

  async listByProperty(propertyId: number): Promise<Revenue[]> { return this.repo.findByPropertyId(propertyId); }
  async create(input: RevenueCreateInput): Promise<Revenue> { return this.repo.create(input); }
  async update(id: number, input: Partial<RevenueCreateInput>): Promise<Revenue | null> { return this.repo.update(id, input); }
  async delete(id: number): Promise<boolean> { return this.repo.delete(id); }
}
