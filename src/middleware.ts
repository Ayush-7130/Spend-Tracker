/**
 * Next.js Middleware for Authentication
 *
 * Handles:
 * - Route protection
 * - Token validation
 * - Redirect unauthenticated users
 * - Allow requests through when refresh token exists for client-side refresh
 *
 * Note: Token refresh is handled by API route and client-side hooks
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyToken, verifyRefreshToken } from "@/lib/auth-edge";

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
  "/api/auth/refresh", // CRITICAL: Don't block refresh endpoint
  "/api/auth/signup",
  "/api/auth/me", // Allow /api/auth/me for token verification after refresh
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

  // Get tokens from cookies
  const accessToken = request.cookies.get("accessToken")?.value;
  const refreshToken = request.cookies.get("refreshToken")?.value;

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

    // Protected API routes - check for valid tokens
    // Strategy: Be less aggressive - allow through if EITHER access OR refresh token is valid
    // This prevents premature 401 errors when access token expires but refresh is still valid

    // First, try access token (most common case)
    if (accessToken) {
      const payload = await verifyToken(accessToken);

      if (payload) {
        // Access token is valid - allow request through
        const response = NextResponse.next();
        response.headers.set("x-user-id", payload.userId);
        response.headers.set("x-user-email", payload.email);
        return response;
      }
    }

    // If access token is invalid/missing but refresh token exists, allow through
    // The client-side code or API endpoint will handle token refresh automatically
    // This prevents aggressive logouts when access token expires but session is still valid
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        // Allow the request through - client-side will refresh the access token
        const response = NextResponse.next();
        response.headers.set("x-user-id", refreshPayload.userId);
        response.headers.set("x-user-email", refreshPayload.email);
        response.headers.set("x-token-refresh-needed", "true"); // Signal that refresh is needed
        return response;
      }
    }

    // No valid tokens at all - only now do we return 401
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
    if (accessToken) {
      const payload = await verifyToken(accessToken);
      if (payload) {
        return NextResponse.redirect(new URL("/", request.url));
      }
    }
    return NextResponse.next();
  }

  // Protected pages - require authentication
  // Strategy: Be less aggressive - allow through if EITHER access OR refresh token is valid
  // This prevents premature redirects to login when access token expires
  if (isProtectedRoute) {
    // No tokens at all - redirect to login immediately
    if (!accessToken && !refreshToken) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return NextResponse.redirect(loginUrl);
    }

    // Has access token - verify it first (most common case)
    if (accessToken) {
      const payload = await verifyToken(accessToken);
      if (payload) {
        // Valid access token - allow page access
        return NextResponse.next();
      }
    }

    // Access token invalid/missing but has refresh token - allow through
    // The client-side authentication code will handle automatic token refresh
    // This prevents aggressive redirects to login when token is about to expire
    if (refreshToken) {
      const refreshPayload = await verifyRefreshToken(refreshToken);
      if (refreshPayload) {
        // Allow page to load - the AuthContext or useTokenRefresh hook will refresh the token
        return NextResponse.next();
      }
    }

    // No valid tokens at all - only now do we redirect to login
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
