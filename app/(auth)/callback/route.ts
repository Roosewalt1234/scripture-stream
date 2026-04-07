import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  // Supabase sends error params here when a link is invalid/expired
  const error = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  if (error) {
    const message =
      errorCode === 'otp_expired'
        ? 'Your verification link expired. Please sign up again to get a new one.'
        : 'Authentication failed. Please try again.';
    return NextResponse.redirect(
      `${origin}/signup?error=${encodeURIComponent(message)}`
    );
  }

  if (code) {
    const supabase = await createClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
    if (!exchangeError) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/signin?error=auth_callback_failed`);
}
