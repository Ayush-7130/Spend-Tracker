import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const {
      amount,
      description,
      date,
      category,
      subcategory,
      paidBy,
      isSplit = false,
      splitDetails = null
    } = body;

    // Validation
    if (!amount || !description || !date || !category || !paidBy) {
      return NextResponse.json(
        { success: false, error: 'Required fields missing' },
        { status: 400 }
      );
    }

    // Validate split logic
    if (isSplit && splitDetails) {
      const { saketAmount = 0, ayushAmount = 0 } = splitDetails;
      if (Math.abs((saketAmount + ayushAmount) - amount) > 0.01) {
        return NextResponse.json(
          { success: false, error: 'Split amounts must equal total amount' },
          { status: 400 }
        );
      }
    }

    const client = await clientPromise;
    const db = client.db('spend-tracker');

    const result = await db.collection('expenses').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          amount: parseFloat(amount),
          description,
          date: new Date(date),
          category,
          subcategory: subcategory || '',
          paidBy,
          isSplit,
          splitDetails: isSplit ? splitDetails : null,
          updatedAt: new Date()
        }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense updated successfully'
    });
  } catch (error) {
    console.error('PUT /api/expenses/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update expense' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('spend-tracker');

    const result = await db.collection('expenses').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Expense deleted successfully'
    });
  } catch (error) {
    console.error('DELETE /api/expenses/[id] error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete expense' },
      { status: 500 }
    );
  }
}
