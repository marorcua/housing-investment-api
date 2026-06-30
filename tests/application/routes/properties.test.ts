import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Hono } from 'hono';

const mockChain = vi.hoisted(() => {
  const chain: any = {
    from: vi.fn(),
    where: vi.fn(),
    values: vi.fn(),
    set: vi.fn(),
    returning: vi.fn(),
    then: vi.fn(),
  };
  chain.from.mockReturnValue(chain);
  chain.where.mockReturnValue(chain);
  chain.values.mockReturnValue(chain);
  chain.set.mockReturnValue(chain);
  chain.returning.mockReturnValue(chain);
  chain.then.mockImplementation((resolve: any) => Promise.resolve([]).then(resolve));
  return chain;
});

const mockDb = vi.hoisted(() => ({
  select: vi.fn(() => mockChain),
  insert: vi.fn(() => mockChain),
  update: vi.fn(() => mockChain),
  delete: vi.fn(() => mockChain),
}));

vi.mock('../../../src/infrastructure/db/index.js', () => ({ db: mockDb }));

import propertiesRoute from '../../../src/application/routes/properties.js';

const mount = () => {
  const app = new Hono();
  app.route('/properties', propertiesRoute);
  return app;
};

beforeEach(() => {
  vi.clearAllMocks();
  mockChain.from.mockReturnValue(mockChain);
  mockChain.where.mockReturnValue(mockChain);
  mockChain.values.mockReturnValue(mockChain);
  mockChain.set.mockReturnValue(mockChain);
  mockChain.returning.mockReturnValue(mockChain);
  mockDb.select.mockReturnValue(mockChain);
  mockDb.insert.mockReturnValue(mockChain);
  mockDb.update.mockReturnValue(mockChain);
  mockDb.delete.mockReturnValue(mockChain);
});

function mockResolve(data: any) {
  mockChain.then.mockImplementation((resolve: any) => Promise.resolve(data).then(resolve));
}

describe('properties route', () => {
  it('GET / — returns list', async () => {
    mockResolve([]);
    const app = mount();
    const res = await app.request('/properties');
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  it('GET /:id — 404 when not found', async () => {
    mockResolve([]);
    const app = mount();
    const res = await app.request('/properties/999');
    expect(res.status).toBe(404);
  });

  it('GET /:id — returns property', async () => {
    mockResolve([{
      id: 1, name: 'Test', address: null,
      purchasePrice: 20000000, purchaseDate: '2024-01-01',
      cadastralValue: null, buildingValue: null,
    }]);
    const app = mount();
    const res = await app.request('/properties/1');
    expect(res.status).toBe(200);
    expect((await res.json() as any).name).toBe('Test');
  });

  it('POST / — creates and returns 201', async () => {
    const createdRow = {
      id: 1, name: 'Test', address: null,
      purchasePrice: 20000000, purchaseDate: '2024-01-01',
      cadastralValue: null, buildingValue: null,
    };
    mockResolve([createdRow]);

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
    const createdRow = {
      id: 2, name: 'Full', address: '123 St',
      purchasePrice: 30000000, purchaseDate: '2024-06-01',
      cadastralValue: 25000000, buildingValue: 20000000,
    };
    mockResolve([createdRow]);

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
    mockResolve([{
      id: 2, name: 'Full', address: '123 St',
      purchasePrice: 30000000, purchaseDate: '2024-06-01',
      cadastralValue: 25000000, buildingValue: 20000000,
    }]);
    const app = mount();
    const res = await app.request('/properties/2');
    expect(res.status).toBe(200);
    const body: any = await res.json();
    expect(body.cadastralValue).toBe(250000);
    expect(body.buildingValue).toBe(200000);
  });

  it('PATCH /:id — updates and returns', async () => {
    const updatedRow = {
      id: 1, name: 'Updated', address: null,
      purchasePrice: 15000000, purchaseDate: '2024-01-01',
      cadastralValue: null, buildingValue: null,
    };
    mockResolve([updatedRow]);

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
    mockResolve([]);

    const app = mount();
    const res = await app.request('/properties/999', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Nope' }),
    });
    expect(res.status).toBe(404);
  });

  it('PATCH /:id — partial update without amount field', async () => {
    const updatedRow = {
      id: 1, name: 'Renamed', address: 'New Address',
      purchasePrice: 15000000, purchaseDate: '2024-01-01',
      cadastralValue: null, buildingValue: null,
    };
    mockResolve([updatedRow]);

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
    const updatedRow = {
      id: 1, name: 'Test', address: '123 St',
      purchasePrice: 25000000, purchaseDate: '2024-06-15',
      cadastralValue: 30000000, buildingValue: 24000000,
    };
    mockResolve([updatedRow]);

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
    mockResolve([{ id: 1 }]);
    const app = mount();
    const res = await app.request('/properties/1', { method: 'DELETE' });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ message: 'Property deleted' });
  });

  it('DELETE /:id — 404 when not found', async () => {
    mockResolve([]);
    const app = mount();
    const res = await app.request('/properties/999', { method: 'DELETE' });
    expect(res.status).toBe(404);
  });
});
