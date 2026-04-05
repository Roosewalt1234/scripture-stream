import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

// Routes that require authentication
const PROTECTED_PATHS = ['/read', '/dashboard', '/study', '/settings'];
// Routes that require a paid subscription
const PREMIUM_PATHS = ['/morning-card'];

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll(); },
        setAll(cookiesToSet: { name: string; value: string; options?: object }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options as Parameters<typeof supabaseResponse.cookies.set>[2])
          );
        },
      },
    }
  );

  // Refresh session — MUST be called before any early return
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Redirect unauthenticated users away from protected routes
  const needsAuth = PROTECTED_PATHS.some(p => pathname.startsWith(p));
  if (needsAuth && !user) {
    const url = request.nextUrl.clone();
    url.pathname = '/signin';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect free users away from premium-only pages
  const needsPremium = PREMIUM_PATHS.some(p => pathname.startsWith(p));
  if (needsPremium && user) {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan, status, current_period_end')
      .eq('user_id', user.id)
      .single();

    const isPaid =
      sub?.plan === 'lifetime' ||
      (sub?.status === 'active' &&
        sub?.plan !== 'free' &&
        (!sub.current_period_end || new Date(sub.current_period_end) > new Date()));

    if (!isPaid) {
      const url = request.nextUrl.clone();
      url.pathname = '/pricing';
      url.searchParams.set('feature', 'morning-card');
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
