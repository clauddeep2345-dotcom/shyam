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

  // Use getSession instead of getUser. getSession decodes the JWT locally, 
  // saving a 200-300ms network round-trip to the Supabase Auth API on every click.
  const { data: { session } } = await supabase.auth.getSession();
  const user = session?.user;

  const { pathname } = request.nextUrl;

  const isProtected = pathname.startsWith('/admin') || pathname.startsWith('/owner') || pathname.startsWith('/supervisor');
  const isLoginPage = pathname === '/login' || pathname === '/';

  if (!user && isProtected) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  if (user && isLoginPage) {
    // Check if we have a fast cookie to redirect them
    const roleCookie = request.cookies.get('user_role')?.value;
    if (roleCookie) {
      return NextResponse.redirect(new URL(`/${roleCookie}`, request.url));
    }
    // Fallback: Look up role in DB if no cookie
    const { data: userData } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();
    const role = userData?.role || 'admin';
    return NextResponse.redirect(new URL(`/${role}`, request.url));
  }

  // Security role checks are now handled directly inside the layout.tsx files 
  // (e.g., await requireRole(['admin'])) which is much faster and more secure.

  return supabaseResponse;
}

export const config = {
  // Only run middleware on these specific paths. This skips middleware entirely 
  // for static files, API routes, or images, speeding up overall page load.
  matcher: ['/', '/login', '/admin/:path*', '/owner/:path*', '/supervisor/:path*'],
};
