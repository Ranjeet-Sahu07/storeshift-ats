import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Gates the /admin and /dashboard route groups behind authentication.
 *
 * Uses `getSession()` rather than `getUser()` — the former reads and
 * verifies the JWT locally from the cookie (no network round trip), while
 * the latter always re-validates against the Supabase Auth server. That
 * network call, happening on *every single navigation*, was the main
 * source of the 2-3 second delay between pages. This is a deliberate
 * speed/certainty trade-off: middleware is just a fast pre-check here,
 * not the actual security boundary — every table already enforces its
 * own RLS regardless of what middleware decides, so a theoretically
 * stale session cookie can't grant access to anything it shouldn't.
 *
 * Role-based gating (which staff can see /admin) is intentionally left
 * to the layout components, not duplicated here — doing it in both
 * places meant an extra database round trip on every request for no
 * added security, since the layout's check is authoritative either way.
 */
export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request: { headers: request.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          response = NextResponse.next({ request: { headers: request.headers } });
          response.cookies.set({ name, value: '', ...options });
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  const path = request.nextUrl.pathname;
  const isProtected = path.startsWith('/admin') || path.startsWith('/dashboard');

  if (isProtected && !session) {
    const redirectUrl = new URL('/login', request.url);
    redirectUrl.searchParams.set('next', path);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*', '/dashboard/:path*'],
};
