import { mapStripeStatus, mapPlanFromPriceId } from '@/lib/stripe/helpers';

describe('mapStripeStatus', () => {
  it('maps active', () => expect(mapStripeStatus('active')).toBe('active'));
  it('maps past_due', () => expect(mapStripeStatus('past_due')).toBe('past_due'));
  it('maps canceled', () => expect(mapStripeStatus('canceled')).toBe('canceled'));
  it('maps trialing', () => expect(mapStripeStatus('trialing')).toBe('trialing'));
  it('maps unknown to canceled', () => expect(mapStripeStatus('unpaid')).toBe('canceled'));
});

describe('mapPlanFromPriceId', () => {
  beforeEach(() => {
    process.env.STRIPE_PRICE_MONTHLY = 'price_monthly';
    process.env.STRIPE_PRICE_ANNUAL = 'price_annual';
    process.env.STRIPE_PRICE_LIFETIME = 'price_lifetime';
  });
  it('maps monthly price', () => expect(mapPlanFromPriceId('price_monthly')).toBe('monthly'));
  it('maps annual price', () => expect(mapPlanFromPriceId('price_annual')).toBe('annual'));
  it('maps lifetime price', () => expect(mapPlanFromPriceId('price_lifetime')).toBe('lifetime'));
  it('defaults unknown to monthly', () => expect(mapPlanFromPriceId('price_unknown')).toBe('monthly'));
});
