import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';
import { createPropertiesRoutes } from '../../../src/properties/application/routes/properties.js';
import { Property } from '../../../src/properties/domain/entities/Property.js';
import { Money } from '../../../src/shared/domain/valueObjects/Money.js';

const mockService = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  delete: vi.fn(),
};

const mount = () => {
  const app = new Hono();
  const route = createPropertiesRoutes(mockService as any);
  app.route('/properties', route);
  return app;
};

const testProperty = new Property(1, 'Test', null, Money.fromEuros(200000), '2024-01-01', null, null);
const testPropertyFull = new Property(2, 'Full', '123 St', Money.fromEuros(300000), '2024-06-01', Money.fromEuros(250000), Money.fromEuros(200000));
const updatedProperty = new Property(1, 'Updated', null, Money.fromEuros(150000), '2024-01-01', null, null);

beforeEach(() => {
  vi.clearAllMocks();
});

describe('properties route', () => {
  it('GET / — returns list', async () => {
    mockService.list.mockResolvedValue([]);
    const app = mount();
    const res = await app.request('/properties');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('GET /:id — 404 when not found', async () => {
    mockService.get.mockResolvedValue(null);
    const app = mount();
    const res = await app.request('/properties/999');
    expect(res.status).toBe(404);
  });

  it('GET /:id — returns property', async () => {
    mockService.get.mockResolvedValue(testProperty);
    const app = mount();
    const res = await app.request('/properties/1');
    expect(res.status).toBe(200);
    expect((await res.json() as any).name).toBe('Test');
  });

  it('POST / — creates and returns 201', async () => {
    mockService.create.mockResolvedValue(testProperty);
    const app = mount();
    const res = await app.request('/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Test', purchasePrice: 200000, purchaseDate: '2024-01-01' }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.name).toBe('Test');
    expect(body.purchasePrice).toBe(200000);
  });

  it('POST / — creates with optional fields', async () => {
    mockService.create.mockResolvedValue(testPropertyFull);
    const app = mount();
    const res = await app.request('/properties', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Full', address: '123 St', purchasePrice: 300000,
        purchaseDate: '2024-06-01', cadastralValue: 250000,
        buildingValue: 200000,
      }),
    });
    expect(res.status).toBe(201);
    const body: any = await res.json();
    expect(body.cadastralValue).toBe(250000);
    expect(body.buildingValue).toBe(200000);
  });

  it('GET /:id — returns property with optional fields', async () => {
    mockService.get.mockResolvedValue(testPropertyFull);
    const app = mount();
    const res = await app.request('/properties/2');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.cadastralValue).toBe(250000);
    expect(body.buildingValue).toBe(200000);
  });

  it('PATCH /:id — updates and returns', async () => {
    mockService.update.mockResolvedValue(updatedProperty);
    const app = mount();
    const res = await app.request('/properties/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Updated', purchasePrice: 150000 }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as any).name).toBe('Updated');
  });

  it('PATCH /:id — 404 when not found', async () => {
    mockService.update.mockResolvedValue(null);
    const app = mount();
    const res = await app.request('/properties/999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('PATCH /:id — partial update without amount field', async () => {
    const renamedProperty = new Property(1, 'Renamed', 'New Address', Money.fromEuros(150000), '2024-01-01', null, null);
    mockService.update.mockResolvedValue(renamedProperty);
    const app = mount();
    const res = await app.request('/properties/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Renamed', address: 'New Address' }),
    });
    expect(res.status).toBe(200);
    expect((await res.json() as any).name).toBe('Renamed');
  });

  it('PATCH /:id — with optional value fields', async () => {
    const fullUpdated = new Property(1, 'Test', '123 St', Money.fromEuros(250000), '2024-06-15', Money.fromEuros(300000), Money.fromEuros(240000));
    mockService.update.mockResolvedValue(fullUpdated);
    const app = mount();
    const res = await app.request('/properties/1', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        address: '123 St', purchaseDate: '2024-06-15',
        cadastralValue: 300000, buildingValue: 240000,
      }),
    });
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.cadastralValue).toBe(300000);
    expect(body.buildingValue).toBe(240000);
  });

  it('DELETE /:id — deletes', async () => {
    mockService.delete.mockResolvedValue(true);
    const app = mount();
    const res = await app.request('/properties/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Property deleted' });
  });

  it('DELETE /:id — 404 when not found', async () => {
    mockService.delete.mockResolvedValue(false);
    const app = mount();
    const res = await app.request('/properties/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
