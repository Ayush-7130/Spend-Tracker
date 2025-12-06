/**
 * Auth utilities for Edge Runtime (Middleware)
 * Uses only Web APIs compatible with Edge Runtime
 */

import { NextRequest } from "next/server";

// JWT Secrets (should be in environment variables)
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "your-super-secret-refresh-key-change-in-production";

// JWT Payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string;
  iat?: number;
  exp?: number;
}

/**
 * Verify JWT token using jose library (Edge Runtime compatible)
 * Includes 60-second clock tolerance to handle clock skew
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    // Use jose library for Edge Runtime
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(JWT_SECRET);

    // Add clock tolerance of 60 seconds to handle clock skew between servers
    const { payload } = await jwtVerify(token, secret, {
      clockTolerance: 60, // 60 seconds tolerance
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      sessionId: payload.sessionId as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Verify refresh token with clock tolerance
 * Includes 60-second clock tolerance to handle clock skew
 */
export async function verifyRefreshToken(
  token: string
): Promise<JWTPayload | null> {
  try {
    const { jwtVerify } = await import("jose");
    const secret = new TextEncoder().encode(JWT_REFRESH_SECRET);

    // Add clock tolerance of 60 seconds to handle clock skew between servers
    const { payload } = await jwtVerify(token, secret, {
      clockTolerance: 60, // 60 seconds tolerance
    });

    return {
      userId: payload.userId as string,
      email: payload.email as string,
      role: payload.role as string,
      sessionId: payload.sessionId as string | undefined,
      iat: payload.iat,
      exp: payload.exp,
    };
  } catch {
    return null;
  }
}

/**
 * Get token from request cookies
 */
export function getTokenFromRequest(request: NextRequest): string | null {
  return request.cookies.get("access_token")?.value || null;
}

/**
 * Get refresh token from request cookies
 */
export function getRefreshTokenFromRequest(
  request: NextRequest
): string | null {
  return request.cookies.get("refresh_token")?.value || null;
}

/**
 * Check if password meets minimum requirements
 */
export function isValidPassword(password: string): boolean {
  // At least 8 characters
  if (password.length < 8) return false;

  // At least one uppercase letter
  if (!/[A-Z]/.test(password)) return false;

  // At least one lowercase letter
  if (!/[a-z]/.test(password)) return false;

  // At least one number
  if (!/\d/.test(password)) return false;

  // At least one special character
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) return false;

  return true;
}
