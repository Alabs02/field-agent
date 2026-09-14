import { NextResponse, type NextRequest } from "next/server";

const API_URL = process.env.API_URL ?? "http://localhost:4000";
const AUTH_REQUIRED = process.env.AUTH_REQUIRED === "true";

/**
 * /backend/* is rewritten to the API so the browser only ever talks to the
 * web origin (first-party cookies, no CORS). /app/* is gated only when
 * AUTH_REQUIRED is on; the real session check happens in the app layout.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/backend/")) {
    const target = new URL(pathname.replace(/^\/backend/, ""), API_URL);
    target.search = search;
    return NextResponse.rewrite(target);
  }

  if (AUTH_REQUIRED && pathname.startsWith("/app")) {
    const hasSession = request.cookies.getAll().some((c) => c.name.includes("session_token"));
    if (!hasSession) {
      const login = new URL("/login", request.url);
      login.searchParams.set("next", pathname + search);
      return NextResponse.redirect(login);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/backend/:path*", "/app/:path*"],
};
