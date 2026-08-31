import { betterFetch } from "@better-fetch/fetch";
import { NextResponse, type NextRequest } from "next/server";
import type { auth } from "@/lib/auth";

type Session = typeof auth.$Infer.Session;

export default async function authMiddleware(request: NextRequest) {
  const baseURL = request.nextUrl.origin;
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL,
      headers: {
        cookie: request.headers.get("cookie") || "", // Pass cookies
      },
    },
  );

  const pathname = request.nextUrl.pathname;
  const isLoginPage = pathname === "/login";
  
  if (!session) {
    if (!isLoginPage && !pathname.startsWith("/api/")) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
    return NextResponse.next();
  }

  // User is logged in
  if (isLoginPage) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Role based access control
  const user = session.user;
  
  // Kasir cannot access /admin
  if (pathname.startsWith("/admin") && user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
