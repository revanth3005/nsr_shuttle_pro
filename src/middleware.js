import { NextResponse } from "next/server";
import { verifyToken, TOKEN_COOKIE } from "@/lib/auth/jwt";

// Route protection at the edge. Unauthenticated users are redirected to /login
// when they try to reach the authenticated app shell under /(app) routes.
const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password"];

export async function middleware(req) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(TOKEN_COOKIE)?.value;
  const payload = token ? await verifyToken(token) : null;
  const isAuthed = !!payload;

  const isPublic = PUBLIC_PREFIXES.some((p) => pathname.startsWith(p));

  if (!isAuthed && !isPublic) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // NOTE: we intentionally do NOT redirect authenticated users away from the
  // public auth pages here. The edge middleware can only verify the JWT
  // signature, not whether the user still exists in the workbook. The (app)
  // layout does the real lookup and redirects to /login when the user is
  // missing (e.g. a stale cookie after the DB was re-seeded). Redirecting
  // /login -> /dashboard here would fight that layout redirect and cause an
  // infinite loop. The login page handles "already signed in" itself.
  return NextResponse.next();
}

// Apply to app pages only (not API, static assets or the public landing page).
export const config = {
  matcher: [
    "/dashboard/:path*",
    "/players/:path*",
    "/clubs/:path*",
    "/tournaments/:path*",
    "/rankings/:path*",
    "/leaderboards/:path*",
    "/notifications/:path*",
    "/reports/:path*",
    "/settings/:path*",
    "/search/:path*",
    "/audit/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
