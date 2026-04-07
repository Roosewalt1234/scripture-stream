import { sm2 } from '@/lib/sm2';

describe('SM-2 algorithm', () => {
  it('easy answer: increases interval and ease_factor', () => {
    const result = sm2({ easeFactor: 2.5, intervalDays: 1 }, 5);
    expect(result.intervalDays).toBeGreaterThan(1);
    expect(result.easeFactor).toBeGreaterThanOrEqual(2.5);
  });

  it('hard answer (quality=1): resets interval to 1', () => {
    const result = sm2({ easeFactor: 2.5, intervalDays: 10 }, 1);
    expect(result.intervalDays).toBe(1);
  });

  it('ease_factor never goes below 1.3', () => {
    let state = { easeFactor: 2.5, intervalDays: 1 };
    for (let i = 0; i < 20; i++) { state = sm2(state, 0); }
    expect(state.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it('quality=3: minimal passing grade passes', () => {
    const result = sm2({ easeFactor: 2.5, intervalDays: 1 }, 3);
    expect(result.intervalDays).toBeGreaterThanOrEqual(1);
  });
});
