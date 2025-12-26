/**
 * Next.js Middleware for Authentication & Security
 *
 * Responsibilities:
 * 1. Route protection - Validates authentication for protected pages/APIs
 * 2. Token validation - Verifies JWT token signatures and expiration
 * 3. Security headers - Adds HTTP security headers to all responses
 * 4. Redirect handling - Routes unauthenticated users to login
 *
 * SECURITY: Single token system with FIXED expiry (no sliding sessions)
 * - Sessions expire at exact time set during login
 * - Refresh route updates activity tracking but NOT expiry time
 * - Expired sessions redirect to login immediately
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyRefreshToken } from "@/lib/auth-edge";

/**
 * Routes requiring valid authentication token
 */
const PROTECTED_ROUTES = [
  "/expenses",
  "/categories",
  "/settlements",
  "/analytics",
  "/profile",
  "/security",
];

/**
 * Routes that redirect to dashboard if already authenticated
 */
const AUTH_ROUTES = ["/login", "/register", "/signup"];

/**
 * Public routes accessible without authentication
 */
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
  "/api/auth/me", // Allow for token validation (session checked in handler)
];

/**
 * Add security headers to response
 *
 * Implements defense-in-depth security through HTTP headers:
 * - X-Frame-Options: Prevents clickjacking attacks
 * - X-Content-Type-Options: Prevents MIME-sniffing attacks
 * - Referrer-Policy: Controls referrer information leakage
 * - X-XSS-Protection: Legacy XSS filter (for older browsers)
 * - Permissions-Policy: Restricts access to browser features
 * - HSTS: Forces HTTPS in production
 * - CSP: Prevents XSS and code injection attacks
 *
 * @param response - Response object to add headers to
 * @returns Response with security headers added
 */
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent page from being displayed in iframe (clickjacking protection)
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME-sniffing attacks by forcing declared content types
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Control referrer information sent in requests
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Enable legacy XSS filter for older browsers
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Restrict access to sensitive browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  );

  // HSTS - Force HTTPS in production to prevent downgrade attacks
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains; preload"
    );
  }

  // Content Security Policy - Restricts resource loading to prevent XSS
  // Note: 'unsafe-inline' and 'unsafe-eval' needed for Next.js development
  // TODO: Tighten CSP for production by removing unsafe-* directives
  response.headers.set(
    "Content-Security-Policy",
    process.env.NODE_ENV === "production"
      ? "default-src 'self'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "style-src 'self' 'unsafe-inline'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:; " +
          "connect-src 'self'; " +
          "frame-ancestors 'none';"
      : "default-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
          "img-src 'self' data: https:; " +
          "font-src 'self' data:;"
  );

  return response;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip middleware for static files, Next.js internals, and file extensions
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.includes(".") // Skip files with extensions (favicon.ico, robots.txt, etc.)
  ) {
    return NextResponse.next();
  }

  // Get authentication token from httpOnly cookie
  const token = request.cookies.get("refreshToken")?.value;

  // Determine route type
  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  );
  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route));
  const isPublicRoute = PUBLIC_ROUTES.some((route) =>
    pathname.startsWith(route)
  );

  // ======================================================================
  // API ROUTE HANDLING
  // ======================================================================

  if (pathname.startsWith("/api")) {
    // Public API routes - allow access without authentication
    if (isPublicRoute) {
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Protected API routes - require valid token and active session
    if (token) {
      const payload = await verifyRefreshToken(token);

      if (payload) {
        // Token signature valid - pass user info to API handler via headers
        // Handler is responsible for checking session.isActive and session.expiresAt
        const response = NextResponse.next();
        response.headers.set("x-user-id", payload.userId);
        response.headers.set("x-user-email", payload.email);
        return addSecurityHeaders(response);
      }
    }

    // No valid token - return 401 Unauthorized
    return addSecurityHeaders(
      NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401 }
      )
    );
  }

  // ======================================================================
  // PAGE ROUTE HANDLING
  // ======================================================================

  // Public pages - allow access without authentication
  if (isPublicRoute) {
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Auth pages (login, signup) - redirect to dashboard if already logged in
  if (isAuthRoute) {
    if (token) {
      const payload = await verifyRefreshToken(token);
      if (payload) {
        // Already authenticated - redirect to home page
        return addSecurityHeaders(
          NextResponse.redirect(new URL("/", request.url))
        );
      }
    }
    // Not authenticated - allow access to auth pages
    const response = NextResponse.next();
    return addSecurityHeaders(response);
  }

  // Protected pages - require authentication
  if (isProtectedRoute) {
    // No token - redirect to login immediately
    if (!token) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("redirect", pathname);
      return addSecurityHeaders(NextResponse.redirect(loginUrl));
    }

    // Verify token signature
    const payload = await verifyRefreshToken(token);
    if (payload) {
      // Token valid - allow access (handler will check session.expiresAt)
      const response = NextResponse.next();
      return addSecurityHeaders(response);
    }

    // Invalid token - redirect to login
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return addSecurityHeaders(NextResponse.redirect(loginUrl));
  }

  // All other routes - allow access with security headers
  const response = NextResponse.next();
  return addSecurityHeaders(response);
}

/**
 * Configure which routes run middleware
 *
 * Matches all routes except:
 * - Static files (_next/static)
 * - Image optimization files (_next/image)
 * - Favicon and other root-level files
 * - Public folder contents
 */
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
