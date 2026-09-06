import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLegacy = pathname.startsWith('/owner') || pathname.startsWith('/supervisor');
  const isAdmin = pathname.startsWith('/admin');
  const isLogin = pathname === '/login';
  const isRoot = pathname === '/';

  // Fast-path: Check for Supabase session cookies
  const allCookies = request.cookies.getAll();
  const hasAuthToken = allCookies.some(c => c.name.includes('-auth-token'));

  // 1. If no session cookie exists at all:
  if (!hasAuthToken) {
    if (isAdmin || isLegacy) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (isRoot) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.next();
  }

  // 2. If it's a Next.js prefetch request and session cookie exists, allow instantly
  const isPrefetch = request.headers.get('purpose') === 'prefetch' ||
                     request.headers.get('next-router-prefetch') === '1';
  if (isPrefetch && isAdmin) {
    return NextResponse.next();
  }

  // 3. For actual navigations with a session cookie, verify with Supabase SSR
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  // If session cookie is invalid or expired
  if (!user) {
    if (isAdmin || isLegacy || isRoot) {
      const redirectRes = NextResponse.redirect(new URL('/login', request.url));
      supabaseResponse.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c));
      return redirectRes;
    }
    return supabaseResponse;
  }

  // User is authenticated
  if (isLegacy || isLogin || isRoot) {
    const redirectRes = NextResponse.redirect(new URL('/admin', request.url));
    supabaseResponse.cookies.getAll().forEach(c => redirectRes.cookies.set(c.name, c.value, c));
    return redirectRes;
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/admin/:path*',
    '/owner/:path*',
    '/supervisor/:path*',
  ],
};
