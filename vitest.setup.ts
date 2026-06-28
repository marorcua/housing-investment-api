import { vi } from 'vitest';

vi.mock('./src/db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    values: vi.fn().mockReturnThis(),
    returning: vi.fn().mockResolvedValue([]),
    update: vi.fn().mockReturnThis(),
    set: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    $dynamic: vi.fn().mockReturnThis(),
    all: vi.fn().mockResolvedValue([]),
    get: vi.fn().mockResolvedValue(undefined),
    run: vi.fn().mockResolvedValue({}),
  },
}));
