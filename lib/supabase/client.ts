import { createBrowserClient } from '@supabase/ssr';

declare global {
  interface Window {
    __ENV__?: { SUPABASE_URL: string; SUPABASE_ANON_KEY: string };
  }
}

export function createClient() {
  // This runs only in the browser — read credentials from window.__ENV__
  // injected by the server-rendered layout (avoids process.env bracket-notation issues).
  const url = window.__ENV__?.SUPABASE_URL ?? '';
  const key = window.__ENV__?.SUPABASE_ANON_KEY ?? '';
  return createBrowserClient(url, key);
}
