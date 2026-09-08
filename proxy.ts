import { NextResponse } from "next/server";
import { auth } from "@/lib/auth/auth";

export default auth((request) => {
  const session = request.auth;
  const pathname = request.nextUrl.pathname;

  const isAuthRoute = pathname === "/auth" || pathname.startsWith("/auth/");

  const isProtectedRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/projects") ||
    pathname.startsWith("/clients") ||
    pathname.startsWith("/time") ||
    pathname.startsWith("/payments") ||
    pathname.startsWith("/settings");

  if (isProtectedRoute && !session?.user) {
    const url = new URL("/auth", request.url);
    url.searchParams.set("callbackUrl", encodeURIComponent(pathname));
    return NextResponse.redirect(url);
  }

  if (isAuthRoute && session?.user) {
    const view = request.nextUrl.searchParams.get("view");
    if (view !== "verify") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/clients/:path*",
    "/time/:path*",
    "/payments/:path*",
    "/settings/:path*",
    "/auth",
  ],
};