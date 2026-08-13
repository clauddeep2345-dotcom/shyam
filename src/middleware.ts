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

  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/owner') || pathname.startsWith('/supervisor');
  const isLoginPage = pathname === '/login' || pathname === '/';

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isLoginPage) {
    // Look up role
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = userData?.role || 'admin';
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }

  // Role-based route protection
  if (user && isProtected) {
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = (userData?.role || 'admin') as string;

    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith('/owner') && role !== 'owner') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
    if (pathname.startsWith('/supervisor') && role !== 'supervisor') {
      return NextResponse.redirect(new URL(`/${role}`, request.url));
    }
  }

  if (pathname === '/') {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};
