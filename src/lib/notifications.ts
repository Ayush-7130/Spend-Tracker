import { dbManager, Notification } from './database';
import { ObjectId } from 'mongodb';

// Notification types and their message generators
export type NotificationType = 
  | 'expense_added'
  | 'expense_updated' 
  | 'expense_deleted'
  | 'settlement_added'
  | 'settlement_updated'
  | 'settlement_deleted'
  | 'category_added'
  | 'category_updated'
  | 'category_deleted';

export interface NotificationData {
  type: NotificationType;
  actorName: string;
  entityName: string;
  entityId?: string;
  amount?: number;
  isSplit?: boolean;
}

// Message generators for different notification types
const messageGenerators: Record<NotificationType, (data: NotificationData) => string> = {
  expense_added: (data) => {
    const expenseType = data.isSplit ? 'split' : 'personal';
    return `${data.actorName} added a ${expenseType} expense: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ''}`;
  },
  expense_updated: (data) => {
    const expenseType = data.isSplit ? 'split' : 'personal';
    return `${data.actorName} updated a ${expenseType} expense: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ''}`;
  },
  expense_deleted: (data) => `${data.actorName} deleted an expense: ${data.entityName}`,
  settlement_added: (data) => `${data.actorName} added a settlement: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ''}`,
  settlement_updated: (data) => `${data.actorName} updated a settlement: ${data.entityName}${data.amount ? ` (₹${data.amount})` : ''}`,
  settlement_deleted: (data) => `${data.actorName} deleted a settlement: ${data.entityName}`,
  category_added: (data) => `${data.actorName} added a category: ${data.entityName}`,
  category_updated: (data) => `${data.actorName} updated a category: ${data.entityName}`,
  category_deleted: (data) => `${data.actorName} deleted a category: ${data.entityName}`
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
      const message = messageGenerators[notificationData.type](notificationData);
      
      await dbManager.createNotification({
        userId,
        type: notificationData.type,
        message,
        entityId: notificationData.entityId,
        entityType: this.getEntityType(notificationData.type),
        read: false
      });
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  // Send notification to all users except the actor
  async broadcastNotification(
    excludeUserId: string,
    notificationData: NotificationData
  ): Promise<void> {
    try {
      const db = await dbManager.getDatabase();
      const users = await db.collection('users')
        .find({ _id: { $ne: new ObjectId(excludeUserId) } })
        .toArray();

      const message = messageGenerators[notificationData.type](notificationData);
      
      const notifications = users.map(user => ({
        userId: user._id.toString(),
        type: notificationData.type,
        message,
        entityId: notificationData.entityId,
        entityType: this.getEntityType(notificationData.type),
        read: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

      if (notifications.length > 0) {
        await db.collection('notifications').insertMany(notifications);
      }
    } catch (error) {
      console.error('Failed to broadcast notification:', error);
    }
  }

  // Get user notifications with pagination
  async getUserNotifications(
    userId: string, 
    page: number = 1, 
    limit: number = 20
  ): Promise<{
    notifications: Notification[];
    total: number;
    unreadCount: number;
  }> {
    try {
      const db = await dbManager.getDatabase();
      
      const skip = (page - 1) * limit;
      
      const [notifications, total, unreadCount] = await Promise.all([
        db.collection('notifications')
          .find({ userId })
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .toArray(),
        db.collection('notifications').countDocuments({ userId }),
        db.collection('notifications').countDocuments({ userId, read: false })
      ]);

      return {
        notifications: notifications.map(n => ({ ...n, _id: n._id.toString() } as Notification)),
        total,
        unreadCount
      };
    } catch (error) {
      console.error('Failed to get user notifications:', error);
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
      const result = await db.collection('notifications').updateMany(
        { userId, read: false },
        { $set: { read: true } }
      );
      return result.modifiedCount > 0;
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      return false;
    }
  }

  // Delete old notifications (cleanup)
  async cleanupOldNotifications(daysToKeep: number = 30): Promise<number> {
    try {
      const db = await dbManager.getDatabase();
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await db.collection('notifications').deleteMany({
        createdAt: { $lt: cutoffDate },
        read: true
      });

      return result.deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old notifications:', error);
      return 0;
    }
  }

  // Helper to get entity type from notification type
  private getEntityType(notificationType: NotificationType): 'expense' | 'settlement' | 'category' | undefined {
    if (notificationType.startsWith('expense_')) return 'expense';
    if (notificationType.startsWith('settlement_')) return 'settlement';
    if (notificationType.startsWith('category_')) return 'category';
    return undefined;
  }
}

// Export singleton instance
export const notificationService = NotificationService.getInstance();