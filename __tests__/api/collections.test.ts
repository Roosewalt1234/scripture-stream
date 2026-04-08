/** @jest-environment node */
import { NextRequest } from 'next/server';

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}));

import { GET, POST } from '@/app/api/collections/route';
import { createClient } from '@/lib/supabase/server';

const mockUser = { id: 'user-123' };
const mockAuth = { getUser: jest.fn().mockResolvedValue({ data: { user: mockUser }, error: null }) };

describe('GET /api/collections', () => {
  it('returns 401 when not authenticated', async () => {
    (createClient as jest.Mock).mockResolvedValue({
      auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    });
    const req = new NextRequest('http://localhost/api/collections');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });

  it('returns collections for authenticated user', async () => {
    const mockCollections = [{ id: 'col-1', name: 'My Favorites', color: '#d97706', user_id: 'user-123' }];
    (createClient as jest.Mock).mockResolvedValue({
      auth: mockAuth,
      from: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockReturnValue({
            order: jest.fn().mockResolvedValue({ data: mockCollections, error: null }),
          }),
        }),
      }),
    });
    const req = new NextRequest('http://localhost/api/collections');
    const res = await GET(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.collections).toHaveLength(1);
  });
});

describe('POST /api/collections', () => {
  it('creates a new collection', async () => {
    const newCol = { id: 'col-new', name: 'Promises', color: '#059669', user_id: 'user-123' };
    (createClient as jest.Mock).mockResolvedValue({
      auth: mockAuth,
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({ data: newCol, error: null }),
          }),
        }),
      }),
    });
    const req = new NextRequest('http://localhost/api/collections', {
      method: 'POST',
      body: JSON.stringify({ name: 'Promises', color: '#059669' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(201);
    const data = await res.json();
    expect(data.collection.name).toBe('Promises');
  });
});
