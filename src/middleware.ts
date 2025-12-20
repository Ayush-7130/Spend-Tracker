/**
 * Next.js Middleware for Authentication
 *
 * Handles:
 * - Route protection
 * - Token validation (single refresh token approach)
 * - Redirect unauthenticated users
 *
 * Note: Uses only refresh token for authentication
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyRefreshToken } from "@/lib/auth-edge";

// Routes that require authentication
const PROTECTED_ROUTES = [
  "/expenses",
  "/categories",
  "/settlements",
  "/analytics",
  "/profile",
  "/security",
];

// Routes that should redirect to home if already authenticated
const AUTH_ROUTES = ["/login", "/register", "/signup"];

// Public routes that don't need authentication
const PUBLIC_ROUTES = [
  "/auth/verify-email",
  "/auth/reset-password",
  "/auth/forgot-password",
  "/api/auth/register",
  "/api/auth/verify-email",
  "/api/auth/login",
  "/api/auth/forgot-password",
  "/api/auth/reset-password",
  "/api/auth/signup",
  "/api/auth/me", // Allow /api/auth/me for token verification
];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // files with extensions
  ) {
    return NextResponse.next();
  }

  // Get refresh token from cookies
  const token = request.cookies.get("refreshToken")?.value;

  // Check if route needs authentication
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // API routes - validate token but don't redirect
  if (pathname.startsWith("/api")) {
    // Public API routes - always allow
    if (isPublicRoute) {
      return NextResponse.next();
    }

    // Protected API routes - check for valid refresh token
    if (token) {
      const payload = await verifyRefreshToken(token);

      if (payload) {
        // Token is valid - allow request through
        const response = NextResponse.next();
        response.headers.set("x-user-id", payload.userId);
        response.headers.set("x-user-email", payload.email);
        return response;
      }
    }

    // No valid token - return 401
    return NextResponse.json(
      { success: false, error: "Authentication required" },
      { status: 401 }
    );
  }

  // Page routes handling

  // Public pages - allow access
  if (isPublicRoute) {
    return NextResponse.next();
  }

  // Auth pages (login, register) - redirect to dashboard if already authenticated
  if (isAuthRoute) {
    if (token) {
      const payload = await verifyRefreshToken(token);
      if (payload) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected pages - require authentication
  if (isProtectedRoute) {
    // No token - redirect to login immediately
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Verify token
    const payload = await verifyRefreshToken(token);
    if (payload) {
      // Valid token - allow page access
      return NextResponse.next();
    }

    // Invalid token - redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Allow access to other routes
  return NextResponse.next();
}

// Configure which routes to run middleware on
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
  ],
};
