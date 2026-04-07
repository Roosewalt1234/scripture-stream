/** @jest-environment node */
// Test the SOAP route auth guard
import { NextRequest } from 'next/server';

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
  }),
}));

describe('SOAP route', () => {
  it('returns 401 when unauthenticated', async () => {
    const { GET } = await import('@/app/api/soap/route');
    const req = new NextRequest('http://localhost/api/soap?book=John&chapter=3');
    const res = await GET(req);
    expect(res.status).toBe(401);
  });
});
