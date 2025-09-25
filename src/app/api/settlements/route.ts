import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

export async function GET() {
  try {
    await client.connect();
    const db = client.db('spend-tracker');
    
    // Get all settlements
    const settlements = await db.collection('settlements').find({}).sort({ date: -1 }).toArray();
    
    return NextResponse.json(settlements);
  } catch (error) {
    console.error('Error fetching settlements:', error);
    return NextResponse.json({ error: 'Failed to fetch settlements' }, { status: 500 });
  } finally {
    await client.close();
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { expenseId, fromUser, toUser, amount, description, date } = body;

    // Validate required fields
    if (!expenseId || !fromUser || !toUser || !amount) {
      return NextResponse.json(
        { error: 'Missing required fields: expenseId, fromUser, toUser, amount' },
        { status: 400 }
      );
    }

    await client.connect();
    const db = client.db('spend-tracker');
    
    // Create new settlement record
    const settlement = {
      expenseId: new ObjectId(expenseId),
      fromUser,
      toUser,
      amount: parseFloat(amount),
      description: description || '',
      date: date ? new Date(date) : new Date(),
      status: 'completed'
    };

    const result = await db.collection('settlements').insertOne(settlement);
    
    return NextResponse.json({
      success: true,
      settlementId: result.insertedId,
      settlement: { ...settlement, _id: result.insertedId }
    });
  } catch (error) {
    console.error('Error creating settlement:', error);
    return NextResponse.json({ error: 'Failed to create settlement' }, { status: 500 });
  } finally {
    await client.close();
  }
}
