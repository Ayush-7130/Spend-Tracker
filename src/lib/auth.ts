import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import * as crypto from "crypto";

// JWT Secrets (should be in environment variables)
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-jwt-key-change-in-production";
const JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ||
  "your-super-secret-refresh-key-change-in-production";

// Token expiration times
// When rememberMe is FALSE (default):
const ACCESS_TOKEN_EXPIRES_IN = "15m"; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = "7d"; // 7 days
// When rememberMe is TRUE:
const ACCESS_TOKEN_EXPIRES_IN_REMEMBERED = "7d"; // 7 days (changed from 1h as per requirements)
const REFRESH_TOKEN_EXPIRES_IN_REMEMBERED = "30d"; // 30 days

// User interface (using database User interface)
export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";
  isEmailVerified: boolean;
  mfaEnabled: boolean;
  accountLocked: boolean;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// JWT Payload interface
export interface JWTPayload {
  userId: string;
  email: string;
  role: string;
  sessionId?: string; // Optional: to track which session this token belongs to
  rememberMe?: boolean; // Optional: to track if user selected "Remember Me"
  iat?: number;
  exp?: number;
}

// Token pair interface
export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

// Hash password utility
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 12;
  return await bcrypt.hash(password, saltRounds);
}

// Verify password utility
export async function verifyPassword(
  password: string,
  hashedPassword: string
): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

// Generate access and refresh tokens
export function generateTokenPair(
  payload: Omit<JWTPayload, "iat" | "exp">,
  rememberMe: boolean = false
): TokenPair {
  const now = new Date();

  // Choose expiration times based on rememberMe setting
  const accessTokenExpiry = rememberMe
    ? ACCESS_TOKEN_EXPIRES_IN_REMEMBERED
    : ACCESS_TOKEN_EXPIRES_IN;
  const refreshTokenExpiry = rememberMe
    ? REFRESH_TOKEN_EXPIRES_IN_REMEMBERED
    : REFRESH_TOKEN_EXPIRES_IN;

  // Generate access token (short-lived or medium-lived if remembered)
  const accessToken = jwt.sign(payload, JWT_SECRET, {
    expiresIn: accessTokenExpiry,
  });

  // Generate refresh token (long-lived or extra-long if remembered)
  const refreshToken = jwt.sign(
    { ...payload, type: "refresh" },
    JWT_REFRESH_SECRET,
    { expiresIn: refreshTokenExpiry }
  );

  // Calculate expiration dates
  // When rememberMe is true: access token = 7 days, refresh token = 30 days
  // When rememberMe is false: access token = 15 minutes, refresh token = 7 days
  const accessTokenExpiresAt = rememberMe
    ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    : new Date(now.getTime() + 15 * 60 * 1000); // 15 minutes

  const refreshTokenExpiresAt = rememberMe
    ? new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days
    : new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days

  return {
    accessToken,
    refreshToken,
    accessTokenExpiresAt,
    refreshTokenExpiresAt,
  };
}

// Generate JWT token (legacy - for backwards compatibility)
export function generateToken(
  payload: Omit<JWTPayload, "iat" | "exp">
): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

// Token verification result interface
export interface TokenVerificationResult {
  payload: JWTPayload | null;
  valid: boolean;
  expired: boolean;
  error?: string;
}

// Verify access token with clock tolerance
export function verifyToken(token: string): JWTPayload | null {
  try {
    // Add 60-second clock tolerance to account for clock skew between servers
    const decoded = jwt.verify(token, JWT_SECRET, {
      clockTolerance: 60, // 60 seconds tolerance
    }) as JWTPayload;
    return decoded;
  } catch (error) {
    return null;
  }
}

// Enhanced token verification with detailed error information
export function verifyAccessToken(token: string): TokenVerificationResult {
  try {
    // Add 60-second clock tolerance to account for clock skew between servers
    const decoded = jwt.verify(token, JWT_SECRET, {
      clockTolerance: 60, // 60 seconds tolerance
    }) as JWTPayload;

    return {
      payload: decoded,
      valid: true,
      expired: false,
    };
  } catch (error: any) {
    // Check if token is expired
    if (error.name === "TokenExpiredError") {
      return {
        payload: null,
        valid: false,
        expired: true,
        error: "Token has expired",
      };
    }

    // Other JWT errors (invalid signature, malformed, etc.)
    return {
      payload: null,
      valid: false,
      expired: false,
      error: error.message || "Token is invalid",
    };
  }
}

// Verify refresh token with clock tolerance
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    // Add 60-second clock tolerance to account for clock skew between servers
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      clockTolerance: 60, // 60 seconds tolerance
    }) as JWTPayload;

    // Ensure it's a refresh token
    if ((decoded as any).type !== "refresh") {
      return null;
    }

    return decoded;
  } catch (error) {
    return null;
  }
}

// Enhanced refresh token verification with detailed error information
export function verifyRefreshTokenEnhanced(
  token: string
): TokenVerificationResult {
  try {
    // Add 60-second clock tolerance to account for clock skew between servers
    const decoded = jwt.verify(token, JWT_REFRESH_SECRET, {
      clockTolerance: 60, // 60 seconds tolerance
    }) as JWTPayload;

    // Ensure it's a refresh token
    if ((decoded as any).type !== "refresh") {
      return {
        payload: null,
        valid: false,
        expired: false,
        error: "Not a refresh token",
      };
    }

    return {
      payload: decoded,
      valid: true,
      expired: false,
    };
  } catch (error: any) {
    // Check if token is expired
    if (error.name === "TokenExpiredError") {
      return {
        payload: null,
        valid: false,
        expired: true,
        error: "Refresh token has expired",
      };
    }

    // Other JWT errors
    return {
      payload: null,
      valid: false,
      expired: false,
      error: error.message || "Refresh token is invalid",
    };
  }
}

// Generate random token for email verification and password reset
export function generateRandomToken(length: number = 32): string {
  return crypto.randomBytes(length).toString("hex");
}

// Hash token for storage (email verification, password reset tokens)
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

// Simple in-memory cache for session validation (10 second TTL)
const sessionValidationCache = new Map<
  string,
  { valid: boolean; timestamp: number }
>();
const SESSION_CACHE_TTL = 10000; // 10 seconds

// Clear session from cache (used when session is revoked)
export function clearSessionCache(accessToken?: string) {
  if (accessToken) {
    sessionValidationCache.delete(accessToken);
  } else {
    // Clear all cache
    sessionValidationCache.clear();
  }
}

// Extract user from request (middleware helper)
export async function getUserFromRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  try {
    // Try to get token from Authorization header
    const authHeader = request.headers.get("Authorization");
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Fallback to cookies - use accessToken (standard cookie name)
      token = request.cookies.get("accessToken")?.value;
    }

    if (!token) {
      return null;
    }

    const payload = verifyToken(token);

    if (!payload) {
      return null;
    }

    // Check cache first to avoid database lookup on every request
    const now = Date.now();
    const cached = sessionValidationCache.get(token);
    if (cached && now - cached.timestamp < SESSION_CACHE_TTL) {
      return cached.valid ? payload : null;
    }

    // Validate that the session is still active in the database
    try {
      const { dbManager } = await import("@/lib/database");
      const db = await dbManager.getDatabase();

      const session = await db.collection("sessions").findOne(
        {
          accessToken: token,
          isActive: true,
        },
        {
          projection: { _id: 1 }, // Only fetch _id for faster query
        }
      );

      // Cache the result
      const isValid = session !== null;
      sessionValidationCache.set(token, { valid: isValid, timestamp: now });

      // Clean up old cache entries (keep cache size manageable)
      if (sessionValidationCache.size > 1000) {
        const entriesToDelete: string[] = [];
        for (const [key, value] of sessionValidationCache.entries()) {
          if (now - value.timestamp > SESSION_CACHE_TTL) {
            entriesToDelete.push(key);
          }
        }
        entriesToDelete.forEach((key) => sessionValidationCache.delete(key));
      }

      // If session is not found or not active, token is invalid
      if (!isValid) {
        return null;
      }

      // CRITICAL FIX: Update lastActivityAt to keep session alive
      // This runs asynchronously without blocking the request
      // Update every 60 seconds to avoid too many DB writes
      const shouldUpdate = !cached || now - cached.timestamp > 60000; // 60 seconds
      if (isValid && session && shouldUpdate) {
        // Fire and forget - don't await to keep request fast
        db.collection("sessions")
          .updateOne(
            { _id: session._id },
            { $set: { lastActivityAt: new Date() } }
          )
          .catch((err) => {});
      }

      return payload;
    } catch (dbError) {
      // If database is unavailable, fall back to JWT validation only
      // This prevents total outage if DB is temporarily down
      return payload;
    }
  } catch (error) {
    return null;
  }
}

// Validate email format
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validate password strength
export function isValidPassword(password: string): {
  valid: boolean;
  message?: string;
} {
  if (password.length < 8) {
    return {
      valid: false,
      message: "Password must be at least 8 characters long",
    };
  }

  if (!/(?=.*[a-z])/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one lowercase letter",
    };
  }

  if (!/(?=.*[A-Z])/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one uppercase letter",
    };
  }

  if (!/(?=.*\d)/.test(password)) {
    return {
      valid: false,
      message: "Password must contain at least one number",
    };
  }

  return { valid: true };
}

// Create authentication middleware response
export function createAuthErrorResponse(
  message: string = "Authentication required"
) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

// Create authorization error response
export function createAuthzErrorResponse(
  message: string = "Insufficient permissions"
) {
  return new Response(JSON.stringify({ success: false, error: message }), {
    status: 403,
    headers: { "Content-Type": "application/json" },
  });
}
