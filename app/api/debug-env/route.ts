/** @jest-environment node */
export const runtime = 'nodejs';

export async function GET() {
  return Response.json({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'SET (' + process.env.NEXT_PUBLIC_SUPABASE_URL.slice(0, 30) + '...)' : 'MISSING',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? 'SET (length=' + process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length + ')' : 'MISSING',
  });
}
