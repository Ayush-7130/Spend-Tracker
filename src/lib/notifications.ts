import { dbManager, Notification } from "./database";
import { ObjectId } from "mongodb";

// Notification types and their message generators
export type NotificationType =
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

export interface NotificationData {
  type: NotificationType;
  actorName: string;
  entityName: string;
  entityId?: string;
  amount?: number;
  isSplit?: boolean;
}

// Message generators for different notification types
const messageGenerators: Record<
  NotificationType,
  (data: NotificationData) => string
> = {
  expense_added: (data) => {
    const expenseType = data.isSplit ? "split" : "personal";
    return `${data.actorName} added a ${expenseType} expense: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ""}`;
  },
  expense_updated: (data) => {
    const expenseType = data.isSplit ? "split" : "personal";
    return `${data.actorName} updated a ${expenseType} expense: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ""}`;
  },
  expense_deleted: (data) =>
    `${data.actorName} deleted an expense: ${data.entityName}`,
  settlement_added: (data) =>
    `${data.actorName} added a settlement: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ""}`,
  settlement_updated: (data) =>
    `${data.actorName} updated a settlement: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ""}`,
  settlement_deleted: (data) =>
    `${data.actorName} deleted a settlement: ${data.entityName}`,
  category_added: (data) =>
    `${data.actorName} added a category: ${data.entityName}`,
  category_updated: (data) =>
    `${data.actorName} updated a category: ${data.entityName}`,
  category_deleted: (data) =>
    `${data.actorName} deleted a category: ${data.entityName}`,
  password_changed: (data) =>
    `🔐 Your password was changed successfully${data.entityName ? ` from ${data.entityName}` : ""}`,
  password_reset: (data) =>
    `🔐 Your password was reset${data.entityName ? ` from ${data.entityName}` : ""}`,
  new_login: (data) =>
    `🔔 New login detected${data.entityName ? ` from ${data.entityName}` : ""}`,
  failed_login_attempts: (data) =>
    `⚠️ ${data.entityName || "Multiple failed login attempts detected on your account"}`,
  session_revoked: (data) =>
    `🚪 A session was revoked${data.entityName ? `: ${data.entityName}` : ""}`,
  mfa_enabled: (data) =>
    `✅ Two-factor authentication has been enabled on your account`,
  mfa_disabled: (data) =>
    `⚠️ Two-factor authentication has been disabled on your account`,
};

export class NotificationService {
  private static instance: NotificationService;

  public static getInstance(): NotificationService {
    if (!NotificationService.instance) {
      NotificationService.instance = new NotificationService();
    }
    return NotificationService.instance;
  }

  // Send notification to specific user
  async sendNotification(
    userId: string,
    notificationData: NotificationData
  ): Promise<void> {
    try {
      const message =
        messageGenerators[notificationData.type](notificationData);

      await dbManager.createNotification({
        userId,
        type: notificationData.type,
        message,
        entityId: notificationData.entityId,
        entityType: this.getEntityType(notificationData.type),
        read: false,
      });
    } catch (error) {
    }
  }

  // Send notification to all users except the actor
  async broadcastNotification(
    excludeUserId: string,
    notificationData: NotificationData
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const users = await db
        .collection("users")
        .find({ _id: { $ne: new ObjectId(excludeUserId) } })
        .toArray();

      const message =
        messageGenerators[notificationData.type](notificationData);

      const notifications = users.map((user) => ({
        userId: user._id.toString(),
        type: notificationData.type,
        message,
        entityId: notificationData.entityId,
        entityType: this.getEntityType(notificationData.type),
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));

      if (notifications.length > 0) {
        await db.collection("notifications").insertMany(notifications);
      }
    } catch (error) {
    }
  }

  // Get user notifications with pagination
  // Optionally filter out notifications excluded for specific session
  async getUserNotifications(
    userId: string,
    page: number = 1,
    limit: number = 20,
    sessionId?: string
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const db = await dbManager.getDatabase();

      const skip = (page - 1) * limit;

      // Build query to exclude notifications for current session
      const query: any = { userId };
      if (sessionId) {
        query["metadata.excludeSessionId"] = { $ne: sessionId };
      }

      const [notifications, total, unreadCount] = await Promise.all([
        db
          .collection("notifications")
          .find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection("notifications").countDocuments(query),
        db
          .collection("notifications")
          .countDocuments({ ...query, read: false }),
      ]);

      return {
        notifications: notifications.map(
          (n) => ({ ...n, _id: n._id.toString() }) as Notification
        ),
        total,
        unreadCount,
      };
    } catch (error) {
      return { notifications: [], total: 0, unreadCount: 0 };
    }
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<boolean> {
    return await dbManager.markNotificationAsRead(notificationId);
  }

  // Mark all notifications as read for a user
  async markAllAsRead(userId: string): Promise<boolean> {
    try {
      const db = await dbManager.getDatabase();
      const result = await db
        .collection("notifications")
        .updateMany({ userId, read: false }, { $set: { read: true } });
      return result.modifiedCount > 0;
    } catch (error) {
      return false;
    }
  }

  // Delete old notifications (cleanup)
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const db = await dbManager.getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db.collection("notifications").deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true,
      });

      return result.deletedCount;
    } catch (error) {
      return 0;
    }
  }

  // Helper to get entity type from notification type
  private getEntityType(
    notificationType: NotificationType
  ): "expense" | "settlement" | "category" | "security" | undefined {
    if (notificationType.startsWith("expense_")) return "expense";
    if (notificationType.startsWith("settlement_")) return "settlement";
    if (notificationType.startsWith("category_")) return "category";
    if (
      [
        "password_changed",
        "password_reset",
        "new_login",
        "failed_login_attempts",
        "session_revoked",
        "mfa_enabled",
        "mfa_disabled",
      ].includes(notificationType)
    ) {
      return "security";
    }
    return undefined;
  }

  // Security-specific notification methods
  async notifyPasswordChanged(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours from now

      await db.collection("notifications").insertOne({
        userId,
        type: "password_changed",
        message: `🔐 Your password was changed successfully${deviceInfo ? ` from ${deviceInfo}` : ""}`,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { deviceInfo, ipAddress },
        createdAt: now,
      });
    } catch (error) {
    }
  }

  async notifyPasswordReset(
    userId: string,
    deviceInfo?: string,
    ipAddress?: string
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.collection("notifications").insertOne({
        userId,
        type: "password_reset",
        message: `🔐 Your password was reset${deviceInfo ? ` from ${deviceInfo}` : ""}`,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { deviceInfo, ipAddress },
        createdAt: now,
      });
    } catch (error) {
    }
  }

  async notifyNewLogin(
    userId: string,
    deviceInfo: string,
    location?: string,
    excludeSessionId?: string
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const locationStr = location ? ` from ${location}` : "";
      const message = `🔔 New login detected: ${deviceInfo}${locationStr}`;

      await db.collection("notifications").insertOne({
        userId,
        type: "new_login",
        message,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { deviceInfo, location, excludeSessionId },
        createdAt: now,
      });
    } catch (error) {
      // Silent fail - notification is not critical
    }
  }

  async notifyFailedLoginAttempts(
    userId: string,
    attemptCount: number
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.collection("notifications").insertOne({
        userId,
        type: "failed_login_attempts",
        message: `⚠️ ${attemptCount} failed login attempts detected on your account`,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { attemptCount },
        createdAt: now,
      });
    } catch (error) {
      // Silent fail - notification is not critical
    }
  }

  async notifySessionRevoked(
    userId: string,
    deviceInfo: string
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      await db.collection("notifications").insertOne({
        userId,
        type: "session_revoked",
        message: `🚪 A session was revoked: ${deviceInfo}`,
        entityType: "security",
        read: false,
        expiresAt,
        metadata: { deviceInfo },
        createdAt: now,
      });
    } catch (error) {
    }
  }

  async notifyMFAEnabled(userId: string): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();

      await db.collection("notifications").insertOne({
        userId,
        type: "mfa_enabled",
        message: `✅ Two-factor authentication has been enabled on your account`,
        entityType: "security",
        read: false,
        createdAt: now,
      });
    } catch (error) {
    }
  }

  async notifyMFADisabled(userId: string): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();

      await db.collection("notifications").insertOne({
        userId,
        type: "mfa_disabled",
        message: `⚠️ Two-factor authentication has been disabled on your account`,
        entityType: "security",
        read: false,
        createdAt: now,
      });
    } catch (error) {
    }
  }

  // Clean up expired notifications (should be run periodically)
  async cleanupExpiredNotifications(): Promise<number> {
    try {
      const db = await dbManager.getDatabase();
      const now = new Date();

      const result = await db.collection("notifications").deleteMany({
        expiresAt: { $lt: now },
      });

      return result.deletedCount;
    } catch (error) {
      return 0;
    }
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();
