import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that require authentication
const PROTECTED_PREFIXES = ["/dashboard", "/suppliers", "/alerts"];

// Routes that are always public
const PUBLIC_ROUTES = new Set(["/", "/login", "/signup", "/callback"]);

function isProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(prefix + "/"),
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pass through all public routes immediately — no session work needed
  if (PUBLIC_ROUTES.has(pathname)) {
    return NextResponse.next();
  }

  // Build a mutable response so the Supabase client can set/rotate cookies
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_APP_SUPABASE_URL!,
    process.env.NEXT_APP_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Write cookies onto the request so server components see them…
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // …and onto the response so the browser persists the rotation
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // IMPORTANT: Do not add any logic between createServerClient and
  // getUser(). A subtle bug can make it hard to debug issues with
  // users being randomly logged out.
  //
  // getUser() validates the JWT with Supabase's servers on every call
  // and triggers a silent token rotation when the access token is close
  // to expiry.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Guard protected routes — redirect to /login when unauthenticated
  if (isProtected(pathname) && !user) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    // Preserve the intended destination so we can redirect back after login
    loginUrl.searchParams.set("redirectTo", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Return the (potentially cookie-updated) response
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     *   - _next/static  (static files)
     *   - _next/image   (image optimisation)
     *   - favicon.ico, sitemap.xml, robots.txt
     *   - any file with an extension (images, fonts, etc.)
     */
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|woff2?)$).*)",
  ],
};
