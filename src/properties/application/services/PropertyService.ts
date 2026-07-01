import { PropertyRepository, PropertyCreateInput } from '../../domain/ports/PropertyRepository.js';
import { Property } from '../../domain/entities/Property.js';

export class PropertyService {
  constructor(private repo: PropertyRepository) {}

  async list(): Promise<Property[]> { return this.repo.findAll(); }
  async get(id: number): Promise<Property | null> { return this.repo.findById(id); }
  async create(input: PropertyCreateInput): Promise<Property> { return this.repo.create(input); }
  async update(id: number, input: Partial<PropertyCreateInput>): Promise<Property | null> { return this.repo.update(id, input); }
  async delete(id: number): Promise<boolean> { return this.repo.delete(id); }
}
