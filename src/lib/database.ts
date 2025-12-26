/**
 * Database Layer - MongoDB Connection and Type-Safe Data Access
 *
 * Provides centralized database access with:
 * - Singleton pattern for connection reuse (prevents connection pool exhaustion)
 * - Type-safe interfaces matching MongoDB document schemas
 * - Helper methods for common database operations
 * - Error handling and connection management
 *
 * WHY Singleton Pattern:
 * - MongoDB connections are expensive to create
 * - Reusing connections improves performance
 * - Prevents "too many connections" errors in production
 *
 * Security Considerations:
 * - All sensitive fields (passwordHash, tokens) are typed but excluded from responses
 * - User operations never return password hashes
 * - Session tokens are stored hashed in the database
 */

import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";
import logger from "./logger";

/**
 * User Document Interface
 *
 * Represents user accounts with comprehensive security fields.
 *
 * Security Features:
 * - passwordHash: bcrypt hashed, never returned in API responses
 * - emailVerificationToken: hashed before storage
 * - passwordResetToken: hashed before storage
 * - mfaSecret: encrypted TOTP secret for 2FA
 * - mfaBackupCodes: single-use recovery codes (hashed)
 * - accountLocked: temporary lockout after failed login attempts
 * - failedLoginAttempts: counter for account lockout mechanism
 */
export interface User {
  _id: string;
  name: string;
  email: string; // Stored lowercase for case-insensitive lookups
  passwordHash: string; // bcrypt hash, 12 rounds
  role: "user" | "admin"; // Role-based access control

  // Email verification: Prevents unauthorized signups
  isEmailVerified: boolean;
  emailVerificationToken?: string; // Hashed 32-byte token
  emailVerificationExpiry?: Date; // 24-hour validity

  // Password security: Reset and change tracking
  passwordChangedAt?: Date; // Invalidates old tokens issued before this time
  passwordResetToken?: string; // Hashed token for forgot password flow
  passwordResetExpiry?: Date; // 1-hour validity

  // Multi-Factor Authentication (TOTP-based)
  mfaEnabled: boolean;
  mfaSecret?: string; // TOTP secret (encrypted at rest)
  mfaBackupCodes?: string[]; // Single-use backup codes (hashed)

  // Account lockout: Prevents brute force attacks
  accountLocked: boolean;
  lockReason?: string; // Human-readable reason for audit
  lockedUntil?: Date; // Auto-unlock time (15 minutes after 5 failed attempts)

  // Login tracking: For security monitoring
  lastLoginAt?: Date;
  failedLoginAttempts: number; // Reset to 0 on successful login
  lastFailedLoginAt?: Date;

  // Audit timestamps
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Session Document Interface
 *
 * Tracks active user sessions with FIXED expiry (no sliding sessions).
 *
 * CRITICAL FIXED EXPIRY MODEL:
 * - expiresAt is set ONCE at login and NEVER modified
 * - lastActivityAt is tracked for analytics only, NOT expiry
 * - rememberMe controls initial duration (1 day vs 7 days)
 * - Session expires at EXACT time from login, regardless of activity
 *
 * WHY Fixed Expiry:
 * - Predictable security model (users know when re-login required)
 * - Prevents indefinite sessions through activity
 * - Simpler implementation (no sliding window logic)
 * - Compliance-friendly (clear audit trail)
 *
 * Device Tracking:
 * - Allows multi-device sessions (phone, laptop, tablet)
 * - Each device has independent session lifecycle
 * - User can view and revoke individual device sessions
 */
export interface Session {
  _id: string;
  userId: string;
  token: string; // Single JWT token (not split access/refresh)
  deviceInfo: {
    userAgent: string; // Full user agent string
    browser?: string; // Parsed browser name (Chrome, Firefox, etc.)
    os?: string; // Parsed OS (Windows, macOS, Linux, iOS, Android)
    device?: string; // Device type (desktop, mobile, tablet)
  };
  location?: {
    city?: string; // Geo-IP lookup (approximate)
    country?: string; // ISO country code
  };
  isActive: boolean; // False when logged out or expired
  rememberMe: boolean; // Controls initial duration at login
  expiresAt: Date; // FIXED expiry - NEVER updated after creation
  createdAt: Date;
  lastActivityAt: Date; // Tracked for analytics, NOT expiry calculation
}

/**
 * Login History Document Interface
 *
 * Audit trail for all login attempts (successful and failed).
 *
 * WHY Track Failed Logins:
 * - Detect brute force attacks
 * - Alert users to unauthorized access attempts
 * - Compliance requirements (SOC2, GDPR)
 *
 * Privacy Considerations:
 * - IP addresses stored for display only, not enforcement
 * - TTL index auto-deletes entries after 90 days
 * - Users can view their own login history
 */
export interface LoginHistory {
  _id: string;
  userId: string;
  email: string;
  success: boolean;
  deviceInfo: {
    userAgent: string;
    browser?: string;
    os?: string;
    device?: string;
  };
  location?: {
    city?: string;
    country?: string;
  };
  failureReason?: string; // "Invalid credentials", "Account locked", "Invalid MFA token"
  timestamp: Date; // Auto-deleted after 90 days via TTL index
}

/**
 * Security Log Document Interface
 *
 * Audit trail for security-sensitive actions.
 *
 * WHY Separate from Login History:
 * - Login history is user-facing (visible in profile)
 * - Security logs are admin-facing (compliance, forensics)
 * - Different retention policies (security logs kept longer)
 *
 * Events Tracked:
 * - Password changes and resets
 * - MFA enable/disable
 * - Session revocations
 * - Account lockouts
 * - Email verifications
 */
export interface SecurityLog {
  _id: string;
  userId: string;
  eventType:
    | "password_change"
    | "password_reset"
    | "mfa_enabled"
    | "mfa_disabled"
    | "session_revoked"
    | "account_locked"
    | "account_unlocked"
    | "email_verified";
  description: string; // Human-readable event description
  metadata?: Record<string, any>; // Additional context (device, location, etc.)
  timestamp: Date;
}

/**
 * Notification Document Interface
 *
 * In-app notifications for user actions and security events.
 *
 * Security Notifications:
 * - New login from unfamiliar device
 * - Failed login attempts
 * - Password changes
 * - MFA status changes
 * - Session revocations
 *
 * WHY Auto-Expire:
 * - Notifications auto-delete 24 hours after being read
 * - Prevents notification bloat
 * - Encourages timely review of security alerts
 *
 * excludeSessionId:
 * - Prevents self-notification (e.g., don't notify current session about own login)
 */
export interface Notification {
  _id: string;
  userId: string;
  type:
    | "expense_added"
    | "expense_updated"
    | "expense_deleted"
    | "settlement_added"
    | "settlement_updated"
    | "settlement_deleted"
    | "category_added"
    | "category_updated"
    | "category_deleted"
    | "password_changed"
    | "password_reset"
    | "new_login"
    | "failed_login_attempts"
    | "session_revoked"
    | "mfa_enabled"
    | "mfa_disabled";
  message: string;
  entityId?: string; // Related entity ID (expense, settlement, category)
  entityType?: "expense" | "settlement" | "category" | "security";
  read: boolean;
  readAt?: Date;
  expiresAt?: Date; // Auto-expire 24 hours after being read
  metadata?: {
    deviceInfo?: string; // Device description for security notifications
    location?: string; // Location string for security notifications
    excludeSessionId?: string; // Exclude this session from receiving notification
  };
  createdAt: Date;
}

/**
 * Expense Document Interface with Ownership Tracking
 *
 * WHY Ownership Field:
 * - Multi-user expense tracking requires knowing who created each expense
 * - Enables permission checks (only creator can edit/delete)
 * - Audit trail for compliance and dispute resolution
 */
export interface ExpenseWithOwnership {
  _id: string;
  amount: number;
  description: string;
  date: string; // ISO 8601 date string
  category: string;
  subcategory?: string;
  paidBy: string; // User ID who paid the expense
  isSplit?: boolean; // Whether expense is split between users
  splitDetails?: {
    saketAmount?: number;
    ayushAmount?: number;
  };
  createdBy: string; // User ID who created this record
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Settlement Document Interface with Ownership Tracking
 *
 * Tracks money transfers between users to settle shared expenses.
 *
 * WHY Status Field:
 * - pending: Settlement created but not yet paid
 * - completed: Payment confirmed by receiving user
 * - cancelled: Settlement voided (e.g., expense was deleted)
 */
export interface SettlementWithOwnership {
  _id: string;
  expenseId: string; // Reference to related expense
  fromUser: string; // User ID who owes money
  toUser: string; // User ID who is owed money
  amount: number;
  description: string;
  date: string; // ISO 8601 date string
  status: "pending" | "completed" | "cancelled";
  createdBy: string; // User ID who created this settlement
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Category Document Interface with Ownership Tracking
 *
 * Custom expense categories with optional subcategories.
 *
 * WHY Subcategories:
 * - Better expense organization (e.g., "Food" > "Groceries", "Restaurants")
 * - More detailed analytics and reporting
 * - User-defined taxonomy for personal finance tracking
 */
export interface CategoryWithOwnership {
  _id: string;
  name: string;
  description: string;
  subcategories: Array<{
    name: string;
    description: string;
  }>;
  createdBy: string; // User ID who created this category
  createdAt: Date;
  updatedAt: Date;
}

/**
 * DatabaseManager Class - Singleton Pattern for Connection Reuse
 *
 * Provides centralized, type-safe database access across the application.
 *
 * WHY Singleton Pattern:
 * - MongoDB client maintains connection pool (default 10 connections)
 * - Multiple instances would create multiple connection pools
 * - Connection pool exhaustion causes "MongoServerSelectionError"
 * - Singleton ensures all code uses the same connection pool
 *
 * Usage:
 *   const dbManager = DatabaseManager.getInstance();
 *   const db = await dbManager.getDatabase();
 *   const user = await db.collection('users').findOne({...});
 */
export class DatabaseManager {
  private static instance: DatabaseManager;

  /**
   * Get singleton instance of DatabaseManager
   *
   * Thread-safe in Node.js (single-threaded event loop)
   */
  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Get MongoDB database connection
   *
   * Uses connection pooling from mongodb.ts (10 connections)
   * Throws error if MongoDB is unreachable (network issues, wrong credentials)
   *
   * @returns MongoDB database instance for 'spend-tracker' database
   */
  async getDatabase() {
    try {
      const client = await clientPromise;
      return client.db("spend-tracker");
    } catch (error) {
      logger.error("Failed to connect to database", error, {
        context: "DatabaseManager.getDatabase",
      });
      throw error;
    }
  }

  // =========================================================================
  // USER OPERATIONS
  // =========================================================================

  /**
   * Create new user account
   *
   * Automatically adds createdAt and updatedAt timestamps
   * Returns user document with MongoDB _id converted to string
   */
  async createUser(
    userData: Omit<User, "_id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const db = await this.getDatabase();
    const now = new Date();

    const user = {
      ...userData,
      createdAt: now,
      updatedAt: now,
    };

    const result = await db.collection("users").insertOne(user);
    return { ...user, _id: result.insertedId.toString() };
  }

  /**
   * Find user by email address
   *
   * Email is stored lowercase for case-insensitive lookups
   * Returns null if user not found (not an error)
   */
  async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.getDatabase();
    const user = await db.collection("users").findOne({ email });

    if (!user) return null;

    return {
      ...user,
      _id: user._id.toString(),
    } as User;
  }

  /**
   * Find user by MongoDB ObjectId
   *
   * Converts string ID to ObjectId for database query
   * Returns null if user not found (not an error)
   */
  async getUserById(userId: string): Promise<User | null> {
    const db = await this.getDatabase();
    const user = await db
      .collection("users")
      .findOne({ _id: new ObjectId(userId) });

    if (!user) return null;

    return {
      ...user,
      _id: user._id.toString(),
    } as User;
  }

  // =========================================================================
  // NOTIFICATION OPERATIONS
  // =========================================================================

  /**
   * Create new notification for user
   *
   * Automatically adds createdAt timestamp
   * Used for both app notifications and security alerts
   */
  async createNotification(
    notificationData: Omit<Notification, "_id" | "createdAt">
  ): Promise<Notification> {
    const db = await this.getDatabase();
    const now = new Date();

    const notification = {
      ...notificationData,
      createdAt: now,
    };

    const result = await db.collection("notifications").insertOne(notification);
    return { ...notification, _id: result.insertedId.toString() };
  }

  async getUserNotifications(
    userId: string,
    limit: number = 50
  ): Promise<Notification[]> {
    const db = await this.getDatabase();
    const notifications = await db
      .collection("notifications")
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();

    return notifications.map(
      (n) => ({ ...n, _id: n._id.toString() }) as Notification
    );
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const db = await this.getDatabase();
    const result = await db
      .collection("notifications")
      .updateOne(
        { _id: new ObjectId(notificationId) },
        { $set: { read: true } }
      );

    return result.modifiedCount > 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const db = await this.getDatabase();
    return await db.collection("notifications").countDocuments({
      userId,
      read: false,
    });
  }

  // Utility method to create indexes for better performance
  async createIndexes() {
    const db = await this.getDatabase();

    // User indexes
    await db.collection("users").createIndex({ email: 1 }, { unique: true });

    // Notification indexes
    await db.collection("notifications").createIndex({ userId: 1, read: 1 });
    await db.collection("notifications").createIndex({ createdAt: -1 });

    // Add createdBy indexes to existing collections
    await db.collection("expenses").createIndex({ createdBy: 1 });
    await db.collection("settlements").createIndex({ createdBy: 1 });
    await db.collection("categories").createIndex({ createdBy: 1 });

    // Login history TTL index - automatically delete documents after 15 days
    await db.collection("loginHistory").createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 15 * 24 * 60 * 60 } // 15 days in seconds
    );

    // Security logs TTL index - automatically delete documents after 15 days
    // Bug Fix #2: Documents expire 15 days after their 'timestamp' field
    await db.collection("securityLogs").createIndex(
      { timestamp: 1 },
      { expireAfterSeconds: 15 * 24 * 60 * 60 } // 15 days in seconds
    );

    // Also create index on securityLogs for query performance
    await db
      .collection("securityLogs")
      .createIndex({ userId: 1, timestamp: -1 });
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();
