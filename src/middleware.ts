import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
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
  const { pathname } = request.nextUrl;

  const isLegacyDashboard = pathname.startsWith('/owner') || pathname.startsWith('/supervisor');
  const isAdminRoute = pathname.startsWith('/admin');
  const isLoginPage = pathname === '/login' || pathname === '/';

  // If visiting legacy owner/supervisor routes, redirect to /admin
  if (isLegacyDashboard) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // If unauthenticated and trying to access protected admin route, redirect to /login
  if (!user && isAdminRoute) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // If logged in and visiting login or root, redirect to /admin
  if (user && isLoginPage) {
    return NextResponse.redirect(new URL('/admin', request.url));
  }

  // If root unauthenticated, redirect to /login
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
