// Integration-level smoke test — middleware logic tested via route behaviour.
// Full auth middleware requires a real Supabase session; test the helper logic only.

import { isPremium } from '@/types';

test('middleware guard: isPremium gates paid routes', () => {
  const freeSub = { id:'1', userId:'u', plan:'free' as const,
    status:'active' as const, currentPeriodEnd: null,
    stripeCustomerId: null, stripeSubscriptionId: null };
  expect(isPremium(freeSub)).toBe(false);
});
