import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { getUserFromRequest } from '@/lib/auth';
import { notificationService } from '@/lib/notifications';
import { dbManager } from '@/lib/database';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

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

    // Get existing expense for audit trail and ownership check
    const existingExpense = await db.collection('expenses').findOne({ _id: new ObjectId(id) });
    
    if (!existingExpense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check ownership (user can only edit their own expenses or admin can edit any)
    if (user.role !== 'admin' && existingExpense.createdBy !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'You can only edit your own expenses' },
        { status: 403 }
      );
    }

    const updateData = {
      amount: parseFloat(amount),
      description,
      date: new Date(date),
      category,
      subcategory: subcategory || '',
      paidBy,
      isSplit,
      splitDetails: isSplit ? splitDetails : null,
      updatedAt: new Date()
    };

    const result = await db.collection('expenses').updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Log activity with changes

    // Send notification to other users
    const currentUser = await dbManager.getUserById(user.userId);
    if (currentUser) {
      await notificationService.broadcastNotification(user.userId, {
        type: 'expense_updated',
        actorName: currentUser.name,
        entityName: description,
        entityId: id,
        amount: parseFloat(amount)
      });
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
    // Authenticate user
    const user = await getUserFromRequest(request);
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const client = await clientPromise;
    const db = client.db('spend-tracker');

    // Get existing expense for audit trail and ownership check
    const existingExpense = await db.collection('expenses').findOne({ _id: new ObjectId(id) });
    
    if (!existingExpense) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Check ownership (user can only delete their own expenses or admin can delete any)
    if (user.role !== 'admin' && existingExpense.createdBy !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'You can only delete your own expenses' },
        { status: 403 }
      );
    }

    const result = await db.collection('expenses').deleteOne({
      _id: new ObjectId(id)
    });

    if (result.deletedCount === 0) {
      return NextResponse.json(
        { success: false, error: 'Expense not found' },
        { status: 404 }
      );
    }

    // Log activity

    // Send notification to other users
    const currentUser = await dbManager.getUserById(user.userId);
    if (currentUser) {
      await notificationService.broadcastNotification(user.userId, {
        type: 'expense_deleted',
        actorName: currentUser.name,
        entityName: existingExpense.description || 'Expense'
      });
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
