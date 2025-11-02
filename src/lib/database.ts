import clientPromise from './mongodb';
import { ObjectId } from 'mongodb';

// User interface (updated with authentication fields)
export interface User {
  _id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  createdAt: Date;
  updatedAt: Date;
}

// Notification interface
export interface Notification {
  _id: string;
  userId: string;
  type: 'expense_added' | 'expense_updated' | 'expense_deleted' | 
        'settlement_added' | 'settlement_updated' | 'settlement_deleted' | 
        'category_added' | 'category_updated' | 'category_deleted';
  message: string;
  entityId?: string;
  entityType?: 'expense' | 'settlement' | 'category';
  read: boolean;
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
  status: 'pending' | 'completed' | 'cancelled';
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
    const client = await clientPromise;
    return client.db('spend-tracker');
  }

  // User operations
  async createUser(userData: Omit<User, '_id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    const db = await this.getDatabase();
    const now = new Date();
    
    const user = {
      ...userData,
      createdAt: now,
      updatedAt: now
    };

    const result = await db.collection('users').insertOne(user);
    return { ...user, _id: result.insertedId.toString() };
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const db = await this.getDatabase();
    const user = await db.collection('users').findOne({ email });
    
    if (!user) return null;
    
    return {
      ...user,
      _id: user._id.toString()
    } as User;
  }

  async getUserById(userId: string): Promise<User | null> {
    const db = await this.getDatabase();
    const user = await db.collection('users').findOne({ _id: new ObjectId(userId) });
    
    if (!user) return null;
    
    return {
      ...user,
      _id: user._id.toString()
    } as User;
  }

  // Notification operations
  async createNotification(notificationData: Omit<Notification, '_id' | 'createdAt'>): Promise<Notification> {
    const db = await this.getDatabase();
    const now = new Date();
    
    const notification = {
      ...notificationData,
      createdAt: now
    };

    const result = await db.collection('notifications').insertOne(notification);
    return { ...notification, _id: result.insertedId.toString() };
  }

  async getUserNotifications(userId: string, limit: number = 50): Promise<Notification[]> {
    const db = await this.getDatabase();
    const notifications = await db.collection('notifications')
      .find({ userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
    
    return notifications.map(n => ({ ...n, _id: n._id.toString() } as Notification));
  }

  async markNotificationAsRead(notificationId: string): Promise<boolean> {
    const db = await this.getDatabase();
    const result = await db.collection('notifications').updateOne(
      { _id: new ObjectId(notificationId) },
      { $set: { read: true } }
    );
    
    return result.modifiedCount > 0;
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const db = await this.getDatabase();
    return await db.collection('notifications').countDocuments({ 
      userId, 
      read: false 
    });
  }

  // Utility method to create indexes for better performance
  async createIndexes() {
    const db = await this.getDatabase();
    
    // User indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    
    // Notification indexes
    await db.collection('notifications').createIndex({ userId: 1, read: 1 });
    await db.collection('notifications').createIndex({ createdAt: -1 });
    
    // Add createdBy indexes to existing collections
    await db.collection('expenses').createIndex({ createdBy: 1 });
    await db.collection('settlements').createIndex({ createdBy: 1 });
    await db.collection('categories').createIndex({ createdBy: 1 });
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();