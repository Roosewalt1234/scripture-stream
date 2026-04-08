/** @jest-environment node */
import { NextRequest } from 'next/server';

jest.mock('@/lib/auth/require-premium', () => ({
  requirePremium: jest.fn(),
}));
jest.mock('@/lib/gemini/service', () => ({
  geminiService: { findCrossReferences: jest.fn() },
}));

import { POST } from '@/app/api/ai/cross-references/route';
import { requirePremium } from '@/lib/auth/require-premium';
import { geminiService } from '@/lib/gemini/service';

describe('POST /api/ai/cross-references', () => {
  it('returns 403 for non-premium users', async () => {
    (requirePremium as jest.Mock).mockResolvedValue({
      ok: false,
      response: new Response(JSON.stringify({ error: 'Premium required' }), { status: 403 }),
    });
    const req = new NextRequest('http://localhost/api/ai/cross-references', {
      method: 'POST',
      body: JSON.stringify({ verseText: 'For God so loved', reference: 'John 3:16' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(403);
  });

  it('returns cross-references for premium users', async () => {
    (requirePremium as jest.Mock).mockResolvedValue({ ok: true, user: { id: 'user-1' } });
    (geminiService.findCrossReferences as jest.Mock).mockResolvedValue([
      { reference: 'Romans 5:8', text: 'But God demonstrates...', connection: "God's love for sinners" },
    ]);
    const req = new NextRequest('http://localhost/api/ai/cross-references', {
      method: 'POST',
      body: JSON.stringify({ verseText: 'For God so loved', reference: 'John 3:16' }),
    });
    const res = await POST(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.references).toHaveLength(1);
    expect(data.references[0].reference).toBe('Romans 5:8');
  });
});
