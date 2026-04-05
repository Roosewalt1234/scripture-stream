import { createBrowserClient } from '@supabase/ssr';

declare global {
  interface Window {
    __ENV__?: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
  }
}

export function createClient() {
  // In the browser, read from window.__ENV__ injected by the server-rendered layout.
  // On the server (SSR), fall back to process.env via bracket notation (runtime read).
  const env = process.env as Record<string, string | undefined>;
  const url =
    (typeof window !== 'undefined' ? window.__ENV__?.SUPABASE_URL : undefined) ??
    env['NEXT_PUBLIC_SUPABASE_URL'] ??
    '';
  const key =
    (typeof window !== 'undefined' ? window.__ENV__?.SUPABASE_ANON_KEY : undefined) ??
    env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ??
    '';
  return createBrowserClient(url, key);
}
