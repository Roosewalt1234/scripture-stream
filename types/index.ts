// ─── Bible ───────────────────────────────────────────────────────────────────

export type Translation = string;

export interface Verse {
  id: string;
  number: number;
  text: string;
  book: string;
  chapter: number;
  translation: Translation;
}

export interface BibleBook {
  name: string;
  chapters: number;
  category: 'Old Testament' | 'New Testament';
}

// ─── User data ───────────────────────────────────────────────────────────────

export interface Bookmark {
  id: string;
  book: string;
  chapter: number;
  verse?: number;
  translation: Translation;
  createdAt: number;
}

export interface Note {
  id: string;
  verseId: string;
  content: string;
  lastUpdated: number;
}

export interface Highlight {
  id: string;
  verseId: string;
  color: string;
}

export interface ReadingProgress {
  book: string;
  chapter: number;
  completedAt: number;
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'sepia';
  fontSize: number;
  lineHeight: number;
  fontFamily: 'serif' | 'sans';
}

// ─── Auth / Subscription ─────────────────────────────────────────────────────

export type SubscriptionPlan = 'free' | 'monthly' | 'annual' | 'lifetime';
export type SubscriptionStatus = 'active' | 'canceled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
}

export interface Profile {
  id: string;
  fullName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}

// ─── AI usage (free tier rate limiting) ──────────────────────────────────────

export interface AIUsage {
  userId: string;
  date: string;
  explanationCount: number;
  contextCount: number;
  imageCount: number;
}

export const AI_FREE_LIMITS = {
  explanation: 5,
  context: 3,
  image: 2,
} as const;

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function isPremium(sub: Subscription | null): boolean {
  if (!sub) return false;
  if (sub.plan === 'lifetime') return true;
  if (sub.status !== 'active') return false;
  if (sub.currentPeriodEnd && new Date(sub.currentPeriodEnd) < new Date()) return false;
  return sub.plan === 'monthly' || sub.plan === 'annual';
}
