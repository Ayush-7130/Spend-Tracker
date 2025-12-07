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
// STRATEGY: Remember Me affects token TTL, cookie maxAge, and session expiry
// All three (JWT expiry, cookie maxAge, session expiresAt) MUST match to prevent early logout
// Without Remember Me:
const ACCESS_TOKEN_EXPIRES_IN = "15m"; // 15 minutes (always short-lived for security)
const REFRESH_TOKEN_EXPIRES_IN = "1d"; // 1 day (session persists for 1 day across browser restarts)
// With Remember Me:
const ACCESS_TOKEN_EXPIRES_IN_REMEMBERED = "15m"; // 15 minutes (same as without)
const REFRESH_TOKEN_EXPIRES_IN_REMEMBERED = "7d"; // 7 days (longer session for convenience)

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
  // CRITICAL: These dates MUST match cookie maxAge and session expiresAt
  // Without Remember Me: access = 15min, refresh = 1 day
  // With Remember Me: access = 15min, refresh = 7 days
  const accessTokenExpiresAt = new Date(now.getTime() + 15 * 60 * 1000); // Always 15 minutes

  const refreshTokenExpiresAt = rememberMe
    ? new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) // 7 days
    : new Date(now.getTime() + 1 * 24 * 60 * 60 * 1000); // 1 day

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
  } catch {
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
  } catch {
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

/**
 * Check if a session has been active for the required duration
 *
 * This is a security feature that requires sessions to be active for a minimum
 * duration before allowing sensitive operations (password change, email change, etc.)
 * This prevents immediate malicious actions from newly compromised accounts.
 *
 * @param userId - The user ID to check
 * @param accessToken - (Optional) The access token to identify the session
 * @param requiredHours - Minimum hours the session must be active (default: 24)
 * @returns Object with isValid boolean and details
 */
export async function checkSessionAge(
  userId: string,
  accessToken?: string,
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

    // If accessToken is provided, use it to find the specific session
    if (accessToken) {
      query.accessToken = accessToken;
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
    console.error("[checkSessionAge] Error:", error);
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
    console.error("[revokeOtherSessions] Error:", error);
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
    console.error("[revokeAllSessions] Error:", error);
    return 0;
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
          .catch(() => {});
      }

      return payload;
    } catch {
      // If database is unavailable, fall back to JWT validation only
      // This prevents total outage if DB is temporarily down
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
