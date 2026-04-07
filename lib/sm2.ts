/** SM-2 spaced repetition algorithm.
 * quality: 0-5 (0=blackout, 3=correct with difficulty, 5=perfect recall)
 * Returns updated ease_factor and interval_days.
 */
export function sm2(
  state: { easeFactor: number; intervalDays: number },
  quality: 0 | 1 | 2 | 3 | 4 | 5,
): { easeFactor: number; intervalDays: number } {
  let { easeFactor, intervalDays } = state;

  if (quality >= 3) {
    if (intervalDays === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    easeFactor = easeFactor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02);
  } else {
    intervalDays = 1;
  }

  if (easeFactor < 1.3) easeFactor = 1.3;

  return { easeFactor, intervalDays };
}

export function nextReviewDate(intervalDays: number): string {
  const d = new Date();
  d.setDate(d.getDate() + intervalDays);
  return d.toISOString().split('T')[0];
}
