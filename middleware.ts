import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { env, hasSupabase } from "@/lib/env";

type CookieToSet = { name: string; value: string; options: CookieOptions };

const PROTECTED_ROUTE_PREFIXES = [
  "/discovery",
  "/dms",
  "/feed",
  "/friends",
  "/landing",
  "/listings",
  "/map",
  "/post",
  "/profile",
  "/stories",
] as const;

export function isProtectedPath(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

function redirectWithRefreshedCookies(url: URL, source: NextResponse): NextResponse {
  const response = NextResponse.redirect(url);
  source.cookies.getAll().forEach((cookie) => response.cookies.set(cookie));
  return response;
}

/**
 * Keep the browser's Supabase auth cookies current before Server Components and
 * API routes read them. With no public Supabase configuration the middleware is
 * deliberately inert so the fixture-first app remains fully usable.
 */
export async function middleware(request: NextRequest) {
  if (!hasSupabase()) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const supabase = createServerClient(env.supabase.url, env.supabase.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: CookieToSet[]) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // getUser validates and, when needed, refreshes the session before routing.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && isProtectedPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    loginUrl.search = "";
    return redirectWithRefreshedCookies(loginUrl, response);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const feedUrl = request.nextUrl.clone();
    feedUrl.pathname = "/feed";
    feedUrl.search = "";
    return redirectWithRefreshedCookies(feedUrl, response);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
