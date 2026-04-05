/** @jest-environment node */
import { POST } from '@/app/api/ai/explain/route';
import { NextRequest } from 'next/server';

// Mock Supabase and Gemini
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
  createServiceClient: jest.fn(),
}));
jest.mock('@/lib/gemini/service', () => ({
  geminiService: { explainVerse: jest.fn().mockResolvedValue('Mock explanation') },
}));

import { createClient, createServiceClient } from '@/lib/supabase/server';

function makeRequest(body: object) {
  return new NextRequest('http://localhost/api/ai/explain', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

function mockSupabase(userId: string | null, plan: string, usageCount: number) {
  (createClient as jest.Mock).mockResolvedValue({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: userId ? { id: userId } : null } }) },
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { plan, status: 'active', current_period_end: null } }),
    }),
  });
  (createServiceClient as jest.Mock).mockReturnValue({
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { explanation_count: usageCount } }),
      upsert: jest.fn().mockResolvedValue({}),
    }),
  });
}

test('returns explanation for authenticated free user under limit', async () => {
  mockSupabase('user-1', 'free', 2);
  const res = await POST(makeRequest({ verseText: 'For God so loved', reference: 'John 3:16' }));
  expect(res.status).toBe(200);
  const json = await res.json();
  expect(json.explanation).toBe('Mock explanation');
});

test('returns 429 for free user at limit', async () => {
  mockSupabase('user-1', 'free', 5);
  const res = await POST(makeRequest({ verseText: 'Test', reference: 'John 1:1' }));
  expect(res.status).toBe(429);
});

test('returns 401 for unauthenticated request', async () => {
  mockSupabase(null, 'free', 0);
  const res = await POST(makeRequest({ verseText: 'Test', reference: 'John 1:1' }));
  expect(res.status).toBe(401);
});
