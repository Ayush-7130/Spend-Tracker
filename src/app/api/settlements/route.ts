import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { NotificationService } from '@/lib/notifications';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('spend-tracker');
    
    // Get all settlements with error handling
    const settlements = await db.collection('settlements').find({}).sort({ date: -1 }).toArray();
    
    return NextResponse.json(settlements);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { expenseId, fromUser, toUser, amount, description, date } = body;

    // Validate required fields
    if (!expenseId || !fromUser || !toUser || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: expenseId, fromUser, toUser, amount' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('spend-tracker');
    
    // Get user details from database
    const currentUser = await db.collection('users').findOne({ _id: new ObjectId(user.userId) });
    if (!currentUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }
    
    // Create new settlement record
    const settlement = {
      expenseId: new ObjectId(expenseId),
      fromUser,
      toUser,
      amount: parseFloat(amount),
      description: description || '',
      date: date ? new Date(date) : new Date(),
      status: 'completed',
      createdBy: user.userId,
      createdAt: new Date()
    };

    const result = await db.collection('settlements').insertOne(settlement);
    
    // Send notification to the other user involved in the settlement
    try {
      const notificationService = NotificationService.getInstance();
      const otherUserName = fromUser === currentUser.name ? toUser : fromUser;
      const settlementDescription = description || `Settlement from ${fromUser} to ${toUser}`;
      
      // Find the other user's ID by their name
      const otherUser = await db.collection('users').findOne({ name: otherUserName });
      
      if (otherUser && otherUser._id.toString() !== user.userId) {
        await notificationService.sendNotification(
          otherUser._id.toString(),
          {
            type: 'settlement_added',
            actorName: currentUser.name,
            entityName: settlementDescription,
            amount: parseFloat(amount)
          }
        );
      }
    } catch (notificationError) {
      console.error('Failed to send settlement notification:', notificationError);
      // Continue without failing the settlement creation
    }
    
    return NextResponse.json({
      success: true,
      settlementId: result.insertedId,
      settlement: { ...settlement, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating settlement:', error);
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 });
  }
}
