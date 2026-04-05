import { isPremium, Subscription } from '@/types';

const base: Subscription = {
  id: '1', userId: 'u1', stripeCustomerId: null, stripeSubscriptionId: null,
  plan: 'monthly', status: 'active',
  currentPeriodEnd: new Date(Date.now() + 86400000).toISOString(),
};

test('active monthly is premium', () => {
  expect(isPremium(base)).toBe(true);
});

test('null subscription is not premium', () => {
  expect(isPremium(null)).toBe(false);
});

test('lifetime is always premium regardless of period', () => {
  expect(isPremium({ ...base, plan: 'lifetime', currentPeriodEnd: null })).toBe(true);
});

test('canceled subscription is not premium', () => {
  expect(isPremium({ ...base, status: 'canceled' })).toBe(false);
});

test('expired active subscription is not premium', () => {
  const expired = { ...base, currentPeriodEnd: new Date(Date.now() - 1000).toISOString() };
  expect(isPremium(expired)).toBe(false);
});
