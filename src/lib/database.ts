import clientPromise from "./mongodb";
import { ObjectId } from "mongodb";

// User interface (updated with enhanced security fields)
export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: "user" | "admin";

  // Email verification
  isEmailVerified: boolean;
  emailVerificationToken?: string;
  emailVerificationExpiry?: Date;

  // Password security
  passwordChangedAt?: Date;
  passwordResetToken?: string;
  passwordResetExpiry?: Date;

  // MFA/2FA
  mfaEnabled: boolean;
  mfaSecret?: string;
  mfaBackupCodes?: string[];

  // Account status
  accountLocked: boolean;
  lockReason?: string;
  lockedUntil?: Date;

  // Login tracking
  lastLoginAt?: Date;
  failedLoginAttempts: number;
  lastFailedLoginAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

// Session interface for JWT-based session tracking
export interface Session {
  _id: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
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
  isActive: boolean;
  rememberMe: boolean; // Remember Me flag - controls token lifetime
  expiresAt: Date;
  createdAt: Date;
  lastActivityAt: Date;
}

// Login history interface for audit trail
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
  failureReason?: string;
  timestamp: Date;
}

// Security log interface for security events
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
  description: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

// Notification interface (enhanced with security notifications)
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
  entityId?: string;
  entityType?: "expense" | "settlement" | "category" | "security";
  read: boolean;
  readAt?: Date;
  expiresAt?: Date; // Auto-expire 24 hours after being read
  metadata?: {
    deviceInfo?: string;
    location?: string;
    excludeSessionId?: string;
  };
  createdAt: Date;
}

// Activity Log interface
// Enhanced interfaces with ownership
export interface ExpenseWithOwnership {
  _id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory?: string;
  paidBy: string;
  isSplit?: boolean;
  splitDetails?: {
    saketAmount?: number;
    ayushAmount?: number;
  };
  createdBy: string; // New field
  createdAt: Date;
  updatedAt: Date;
}

export interface SettlementWithOwnership {
  _id: string;
  expenseId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: string;
  status: "pending" | "completed" | "cancelled";
  createdBy: string; // New field
  createdAt: Date;
  updatedAt: Date;
}

export interface CategoryWithOwnership {
  _id: string;
  name: string;
  description: string;
  subcategories: Array<{
    name: string;
    description: string;
  }>;
  createdBy: string; // New field
  createdAt: Date;
  updatedAt: Date;
}

// Database utilities
export class DatabaseManager {
  private static instance: DatabaseManager;

  public static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  // Get database connection
  async getDatabase() {
    try {
      const client = await clientPromise;
      return client.db("spend-tracker");
    } catch (error) {
      console.error("Failed to connect to database:", error);
      throw error;
    }
  }

  // User operations
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

  async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.getDatabase();
    const user = await db.collection("users").findOne({ email });

    if (!user) return null;

    return {
      ...user,
      _id: user._id.toString(),
    } as User;
  }

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

  // Notification operations
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
