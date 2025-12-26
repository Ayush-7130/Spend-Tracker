import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import * as crypto from "crypto";
import logger from "./logger";

/**
 * JWT Secret for single-token authentication
 *
 * SECURITY: Single token system with fixed expiry (no sliding sessions)
 * - Token expiry is set once at login and NEVER extended
 * - Remember Me = false: 1 day fixed expiry
 * - Remember Me = true: 7 days fixed expiry
 * - Refresh route validates but does NOT extend session
 */
const JWT_SECRET =
  process.env.JWT_SECRET || "your-super-secret-key-change-in-production";

/**
 * Token expiration configuration
 *
 * CRITICAL: All three components MUST have matching expiry times:
 * 1. JWT token expiry (expiresIn parameter)
 * 2. HTTP cookie maxAge (in seconds)
 * 3. Database session expiresAt (Date object)
 *
 * Mismatch causes premature logout or stale session issues.
 *
 * Without Remember Me: 1 day fixed duration
 * With Remember Me: 7 days fixed duration
 */
const TOKEN_EXPIRES_IN = "1d"; // 1 day without Remember Me
const TOKEN_EXPIRES_IN_REMEMBERED = "7d"; // 7 days with Remember Me

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

// Token info interface
export interface TokenInfo {
  token: string;
  expiresAt: Date;
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

/**
 * Generate authentication token with fixed expiry
 *
 * Creates a JWT token with fixed expiration time that NEVER extends.
 * This is the core of the fixed-session security model.
 *
 * SECURITY RATIONALE:
 * - Fixed expiry prevents infinite session extension attacks
 * - Stolen tokens have guaranteed expiration time
 * - Forces periodic re-authentication for security
 *
 * @param payload - User identification data (userId, email, role)
 * @param rememberMe - If true, extends session to 7 days instead of 1 day
 * @returns TokenInfo with signed JWT and exact expiration date
 */
export function generateRefreshToken(
  payload: Omit<JWTPayload, "iat" | "exp">,
  rememberMe: boolean = false
): TokenInfo {
  const now = new Date();

  // Choose fixed expiration duration based on Remember Me preference
  const tokenExpiry = rememberMe
    ? TOKEN_EXPIRES_IN_REMEMBERED
    : TOKEN_EXPIRES_IN;

  // Generate JWT token with fixed expiration
  const token = jwt.sign({ ...payload, type: "refresh" }, JWT_SECRET, {
    expiresIn: tokenExpiry,
  });

  // Calculate exact expiration timestamp
  // CRITICAL: This MUST match:
  // 1. Cookie maxAge (converted to seconds)
  // 2. Database session.expiresAt field
  // Without Remember Me: 1 day = 86400 seconds
  // With Remember Me: 7 days = 604800 seconds
  const expiresAt = rememberMe
    ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days in milliseconds
    : new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day in milliseconds

  return {
    token,
    expiresAt,
  };
}

// Token verification result interface
export interface TokenVerificationResult {
  payload: JWTPayload | null;
  valid: boolean;
  expired: boolean;
  error?: string;
}

/**
 * Verify authentication token
 *
 * Validates JWT token signature and expiration.
 * Includes clock tolerance to handle minor time differences between servers.
 *
 * SECURITY: This only verifies the token itself, NOT the session status.
 * Always check database session.isActive and session.expiresAt after
 * token verification to ensure session hasn't been revoked.
 *
 * @param token - JWT token string to verify
 * @returns Decoded payload if valid, null if invalid/expired
 */
export function verifyRefreshToken(token: string): JWTPayload | null {
  try {
    // Verify token with 60-second clock tolerance for distributed systems
    // This prevents false negatives from minor clock drift between servers
    const decoded = jwt.verify(token, JWT_SECRET, {
      clockTolerance: 60,
    }) as JWTPayload;

    // Ensure token has correct type marker
    if ((decoded as any).type !== "refresh") {
      return null;
    }

    return decoded;
  } catch {
    // Invalid signature, expired token, or malformed JWT
    return null;
  }
}

/**
 * Enhanced token verification with detailed error reporting
 *
 * Provides comprehensive validation results including specific error types.
 * Useful for debugging authentication issues and providing clear user feedback.
 *
 * @param token - JWT token string to verify
 * @returns TokenVerificationResult with detailed status and error information
 */
export function verifyRefreshTokenEnhanced(
  token: string
): TokenVerificationResult {
  try {
    // Verify token with clock tolerance
    const decoded = jwt.verify(token, JWT_SECRET, {
      clockTolerance: 60,
    }) as JWTPayload;

    // Validate token type
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
    // Token expired - session needs renewal via login
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
export function clearSessionCache(token?: string) {
  if (token) {
    sessionValidationCache.delete(token);
  } else {
    // Clear all cache
    sessionValidationCache.clear();
  }
}

/**
 * Check if a session has been active for the required duration
 *
 * This is a security feature that requires sessions to be active for a minimum
 * duration before allowing sensitive operations (password change, email change, etc.)
 * This prevents immediate malicious actions from newly compromised accounts.
 *
 * @param userId - The user ID to check
 * @param token - (Optional) The refresh token to identify the session
 * @param requiredHours - Minimum hours the session must be active (default: 24)
 * @returns Object with isValid boolean and details
 */
export async function checkSessionAge(
  userId: string,
  token?: string,
  requiredHours: number = 24
): Promise<{
  isValid: boolean;
  sessionAge: number; // in hours
  requiredAge: number; // in hours
  createdAt?: Date;
  message?: string;
}> {
  try {
    const { dbManager } = await import("@/lib/database");
    const db = await dbManager.getDatabase();

    // Find the current active session
    const query: any = {
      userId,
      isActive: true,
    };

    // If token is provided, use it to find the specific session
    if (token) {
      query.token = token;
    }

    const session = await db
      .collection("sessions")
      .findOne(query, { sort: { createdAt: -1 } }); // Get most recent session

    if (!session) {
      return {
        isValid: false,
        sessionAge: 0,
        requiredAge: requiredHours,
        message: "No active session found",
      };
    }

    // Calculate session age in hours
    const now = new Date();
    const sessionCreatedAt = new Date(session.createdAt);
    const sessionAgeMs = now.getTime() - sessionCreatedAt.getTime();
    const sessionAgeHours = sessionAgeMs / (1000 * 60 * 60);

    // Check if session meets minimum age requirement
    const isValid = sessionAgeHours >= requiredHours;

    return {
      isValid,
      sessionAge: Math.floor(sessionAgeHours * 10) / 10, // Round to 1 decimal
      requiredAge: requiredHours,
      createdAt: sessionCreatedAt,
      message: isValid
        ? "Session age requirement met"
        : `Session must be active for ${requiredHours} hours. Current: ${Math.floor(sessionAgeHours)} hours`,
    };
  } catch (error) {
    logger.error("[checkSessionAge] Error", error, {
      context: "checkSessionAge",
    });
    return {
      isValid: false,
      sessionAge: 0,
      requiredAge: requiredHours,
      message: "Error checking session age",
    };
  }
}

/**
 * Revoke all other active sessions for a user (except the current one)
 *
 * This is useful for security-sensitive operations like:
 * - Password changes
 * - Email changes
 * - Profile security updates
 * - Enabling/disabling MFA
 *
 * @param userId - The user ID whose sessions should be revoked
 * @param currentSessionId - (Optional) The current session ID to keep active
 * @param reason - (Optional) Reason for revocation (for logging)
 * @returns Number of sessions revoked
 */
export async function revokeOtherSessions(
  userId: string,
  currentSessionId?: string,
  reason: string = "security_action"
): Promise<number> {
  try {
    const { dbManager } = await import("@/lib/database");
    const db = await dbManager.getDatabase();

    // Build query to revoke all sessions except the current one
    const query: any = {
      userId,
      isActive: true,
    };

    // If currentSessionId is provided, exclude it from revocation
    if (currentSessionId) {
      query._id = { $ne: currentSessionId };
    }

    // Update all matching sessions to inactive
    const result = await db.collection("sessions").updateMany(query, {
      $set: {
        isActive: false,
        revokedAt: new Date(),
        revokedReason: reason,
      },
    });

    // Clear session cache for affected sessions
    clearSessionCache();

    // Log the revocation for audit
    await db.collection("securityLogs").insertOne({
      userId,
      eventType: "sessions_revoked",
      description: `Revoked ${result.modifiedCount} other session(s)`,
      metadata: {
        sessionsRevoked: result.modifiedCount,
        currentSessionPreserved: !!currentSessionId,
        reason,
      },
      timestamp: new Date(),
    });

    return result.modifiedCount;
  } catch (error) {
    logger.error("[revokeOtherSessions] Error", error, {
      context: "revokeOtherSessions",
      userId,
    });
    return 0;
  }
}

/**
 * Revoke ALL active sessions for a user (including current)
 *
 * This is useful for:
 * - Account compromise
 * - Forced logout from admin
 * - Account deletion
 *
 * @param userId - The user ID whose sessions should be revoked
 * @param reason - (Optional) Reason for revocation (for logging)
 * @returns Number of sessions revoked
 */
export async function revokeAllSessions(
  userId: string,
  reason: string = "security_action"
): Promise<number> {
  try {
    const { dbManager } = await import("@/lib/database");
    const db = await dbManager.getDatabase();

    // Revoke ALL active sessions for this user
    const result = await db.collection("sessions").updateMany(
      {
        userId,
        isActive: true,
      },
      {
        $set: {
          isActive: false,
          revokedAt: new Date(),
          revokedReason: reason,
        },
      }
    );

    // Clear session cache
    clearSessionCache();

    // Log the revocation for audit
    await db.collection("securityLogs").insertOne({
      userId,
      eventType: "all_sessions_revoked",
      description: `Revoked all ${result.modifiedCount} active session(s)`,
      metadata: {
        sessionsRevoked: result.modifiedCount,
        reason,
      },
      timestamp: new Date(),
    });

    return result.modifiedCount;
  } catch (error) {
    logger.error("[revokeAllSessions] Error", error, {
      context: "revokeAllSessions",
      userId,
      reason,
    });
    return 0;
  }
}

/**
 * Extract user from HTTP request and validate session
 *
 * Comprehensive authentication validation:
 * 1. Extracts token from Authorization header or cookie
 * 2. Verifies JWT signature and expiration
 * 3. Checks session still exists and is active in database
 * 4. Validates session hasn't reached FIXED expiry time
 * 5. Updates lastActivityAt for tracking (NOT expiry)
 *
 * SECURITY: Session expiry is FIXED and never extended.
 * This function validates against the original expiresAt set during login.
 *
 * @param request - Next.js HTTP request object
 * @returns Decoded JWT payload if valid, null if invalid/expired
 */
export async function getUserFromRequest(
  request: NextRequest
): Promise<JWTPayload | null> {
  try {
    // Extract token from Authorization header or cookie
    const authHeader = request.headers.get("Authorization");
    let token = null;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      // Fallback to httpOnly cookie (single token approach)
      token = request.cookies.get("refreshToken")?.value;
    }

    if (!token) {
      return null;
    }

    // Verify JWT signature and expiration
    const payload = verifyRefreshToken(token);

    if (!payload) {
      // Token invalid or expired according to JWT expiration
      return null;
    }

    // Check cache to avoid database query on every request (performance optimization)
    const now = Date.now();
    const cached = sessionValidationCache.get(token);
    if (cached && now - cached.timestamp < SESSION_CACHE_TTL) {
      return cached.valid ? payload : null;
    }

    // Validate session in database (check active status and fixed expiry)
    try {
      const { dbManager } = await import("@/lib/database");
      const db = await dbManager.getDatabase();

      // Fetch session with expiry information
      const session = await db.collection("sessions").findOne(
        {
          token: token,
          isActive: true,
        },
        {
          projection: { _id: 1, expiresAt: 1 }, // Fetch session ID and expiry
        }
      );

      // Session not found or has been revoked
      if (!session) {
        sessionValidationCache.set(token, { valid: false, timestamp: now });
        return null;
      }

      // CRITICAL: Validate FIXED session expiry hasn't been reached
      // Sessions expire at exact time set during login, never extended
      if (session.expiresAt && new Date() > new Date(session.expiresAt)) {
        // Session has expired - mark as inactive in database
        await db.collection("sessions").updateOne(
          { _id: session._id },
          {
            $set: {
              isActive: false,
              expiredAt: new Date(),
            },
          }
        );

        // Clear from cache
        sessionValidationCache.set(token, { valid: false, timestamp: now });
        return null;
      }

      // Session valid - cache the result
      sessionValidationCache.set(token, { valid: true, timestamp: now });

      // Clean up old cache entries (prevent memory leak)
      if (sessionValidationCache.size > 1000) {
        const entriesToDelete: string[] = [];
        for (const [key, value] of sessionValidationCache.entries()) {
          if (now - value.timestamp > SESSION_CACHE_TTL) {
            entriesToDelete.push(key);
          }
        }
        entriesToDelete.forEach((key) => sessionValidationCache.delete(key));
      }

      // Update lastActivityAt for tracking purposes ONLY
      // This does NOT extend session expiry - just tracks last usage
      // Update throttled to every 60 seconds to reduce database writes
      const shouldUpdate = !cached || now - cached.timestamp > 60000;
      if (shouldUpdate) {
        // Fire and forget - don't await to keep request fast
        // SECURITY: Only updates lastActivityAt, NOT expiresAt
        db.collection("sessions")
          .updateOne(
            { _id: session._id },
            { $set: { lastActivityAt: new Date() } }
          )
          .catch(() => {
            // Silently fail - activity tracking is non-critical
          });
      }

      return payload;
    } catch {
      // Database unavailable - fall back to JWT validation only
      // This prevents complete service outage if database is temporarily down
      // Less secure but better than rejecting all valid requests
      return payload;
    }
  } catch {
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
