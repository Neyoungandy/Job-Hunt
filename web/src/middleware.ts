import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const token = req.cookies.get("session")?.value;
  if (!token) {
    const u = new URL("/login", req.url);
    u.searchParams.set("from", `${path}${req.nextUrl.search}`);
    return NextResponse.redirect(u);
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/dashboard/:path*",
    "/search",
    "/search/:path*",
    "/resume",
    "/resume/:path*",
    "/roles",
    "/roles/:path*",
    "/applications",
    "/applications/:path*",
    "/settings",
    "/settings/:path*",
  ],
};
