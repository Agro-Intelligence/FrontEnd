import { NextRequest, NextResponse } from "next/server";
import {
  AUTH_COOKIE_NAME,
  LOGIN_API_PATH,
  LOGIN_PATH,
  LOGOUT_API_PATH,
  getAuthConfig,
} from "@/lib/auth";

const PUBLIC_FILE = /\.(.*)$/;

function isPublicPath(pathname: string): boolean {
  return (
    pathname === LOGIN_PATH ||
    pathname === LOGIN_API_PATH ||
    pathname === LOGOUT_API_PATH ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/icons/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/public/") ||
    PUBLIC_FILE.test(pathname)
  );
}

export function proxy(request: NextRequest) {
  const { enabled, sessionToken } = getAuthConfig();
  if (!enabled) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  const cookie = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = cookie === sessionToken;

  if (pathname === LOGIN_PATH && isAuthenticated) {
    const redirectUrl = new URL("/", request.url);
    return NextResponse.redirect(redirectUrl);
  }

  if (isPublicPath(pathname)) return NextResponse.next();
  if (isAuthenticated) return NextResponse.next();

  const loginUrl = new URL(LOGIN_PATH, request.url);
  const next = `${pathname}${search || ""}`;
  if (next && next !== LOGIN_PATH) {
    loginUrl.searchParams.set("next", next);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/:path*"],
};
