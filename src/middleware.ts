import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Gates the /admin and /dashboard route groups behind authentication.
 *
 * This is the source of the "Using the user object as returned from
 * getSession()... could be insecure" warning you may see in the server
 * log — that warning is accurate, and is addressed everywhere the result
 * is actually used to make an authorization decision (see
 * src/lib/auth.ts's getCurrentProfile(), which uses getUser() instead).
 * Middleware is the one deliberate exception: it only decides "does a
 * session cookie exist at all, redirect to /login if not" — it never
 * reads role/profile data or grants access to anything based on this
 * check. The actual authorization (which role sees what) happens in the
 * layout components via getUser(), and every table's RLS policy is the
 * real, final enforcement boundary regardless of what middleware decides.
 * Given that, paying for a network round-trip to re-verify the token on
 * every single navigation — which was the main source of the 2-3 second
 * delay between pages — bought no additional security here, only latency.
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
