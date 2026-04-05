import { createBrowserClient } from '@supabase/ssr';

declare global {
  interface Window {
    __ENV__?: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
  }
}

export function createClient() {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' ? window.__ENV__?.SUPABASE_URL : '') ||
    '';
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' ? window.__ENV__?.SUPABASE_ANON_KEY : '') ||
    '';
  return createBrowserClient(url, key);
}
