import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const user = searchParams.get('user') || 'all'; // Default to all
    
    const client = await clientPromise;
    const db = client.db('spend-tracker');

    // Build match condition based on user selection
    let userMatch = {};
    if (user !== 'all') {
      userMatch = { paidBy: user };
    }

    // Get total expenses for the selected user(s)
    const totalExpensesResult = await db.collection('expenses').aggregate([
      {
        $match: userMatch
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const totalExpenses = totalExpensesResult[0]?.totalAmount || 0;
    const totalExpenseCount = totalExpensesResult[0]?.count || 0;

    // Get this month's expenses for the selected user(s)
    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const thisMonthMatch = {
      ...userMatch,
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    };

    const thisMonthResult = await db.collection('expenses').aggregate([
      {
        $match: thisMonthMatch
      },
      {
        $group: {
          _id: null,
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const thisMonthTotal = thisMonthResult[0]?.totalAmount || 0;
    const thisMonthCount = thisMonthResult[0]?.count || 0;

    // Get categories count
    const categoriesCount = await db.collection('categories').countDocuments();

    // Calculate settlement using the new settlements collection
    let settlementAmount = 0;
    let settlementMessage = 'All settled up!';

    if (user !== 'all') {
      // Get all split expenses from expenses collection
      const splitExpenses = await db.collection('expenses')
        .find({ isSplit: true })
        .toArray();

      // Get all settlements
      const settlements = await db.collection('settlements')
        .find({})
        .toArray();

      // Calculate balances for this user
      const balances: { [key: string]: number } = {};
      
      // Process split expenses based on existing expense structure
      for (const expense of splitExpenses) {
        if (expense.splitDetails) {
          // Use the existing splitDetails structure (saketAmount, ayushAmount)
          const { saketAmount = 0, ayushAmount = 0 } = expense.splitDetails;
          const paidBy = expense.paidBy;
          
          // Calculate what each person should pay vs what the payer paid
          if (paidBy.toLowerCase() === 'saket') {
            // Saket paid, Ayush owes his portion
            if (ayushAmount > 0) {
              const key = `Ayush_to_Saket`;
              balances[key] = (balances[key] || 0) + ayushAmount;
            }
          } else if (paidBy.toLowerCase() === 'ayush') {
            // Ayush paid, Saket owes his portion
            if (saketAmount > 0) {
              const key = `Saket_to_Ayush`;
              balances[key] = (balances[key] || 0) + saketAmount;
            }
          }
        } else {
          // Fallback: if no splitDetails, assume equal split between Saket and Ayush
          const amountPerPerson = expense.amount / 2;
          const paidBy = expense.paidBy;
          
          if (paidBy.toLowerCase() === 'saket') {
            const key = `Ayush_to_Saket`;
            balances[key] = (balances[key] || 0) + amountPerPerson;
          } else if (paidBy.toLowerCase() === 'ayush') {
            const key = `Saket_to_Ayush`;
            balances[key] = (balances[key] || 0) + amountPerPerson;
          }
        }
      }
      
      // Subtract settlements from balances
      for (const settlement of settlements) {
        const key = `${settlement.fromUser}_to_${settlement.toUser}`;
        balances[key] = (balances[key] || 0) - settlement.amount;
      }
      
      // Calculate net balance for the current user (net difference approach)
      const saketOwesAyush = (balances['Saket_to_Ayush'] || 0);
      const ayushOwesSaket = (balances['Ayush_to_Saket'] || 0);
      
      // Calculate net difference
      const netBalance = ayushOwesSaket - saketOwesAyush;
      
      if (user.toLowerCase() === 'saket') {
        if (netBalance > 0.01) {
          // Net: Ayush owes Saket
          settlementAmount = netBalance;
          settlementMessage = `Ayush owes you ₹${netBalance.toFixed(2)}`;
        } else if (netBalance < -0.01) {
          // Net: Saket owes Ayush
          settlementAmount = Math.abs(netBalance);
          settlementMessage = `You owe Ayush ₹${Math.abs(netBalance).toFixed(2)}`;
        } else {
          settlementAmount = 0;
          settlementMessage = 'All settled up!';
        }
      } else if (user.toLowerCase() === 'ayush') {
        if (netBalance > 0.01) {
          // Net: Ayush owes Saket
          settlementAmount = netBalance;
          settlementMessage = `You owe Saket ₹${netBalance.toFixed(2)}`;
        } else if (netBalance < -0.01) {
          // Net: Saket owes Ayush
          settlementAmount = Math.abs(netBalance);
          settlementMessage = `Saket owes you ₹${Math.abs(netBalance).toFixed(2)}`;
        } else {
          settlementAmount = 0;
          settlementMessage = 'All settled up!';
        }
      }
    } else {
      settlementMessage = 'View individual users for settlement details';
    }

    // Get recent expenses for the selected user(s) (last 5)
    const recentExpenses = await db.collection('expenses').aggregate([
      {
        $match: userMatch
      },
      {
        $lookup: {
          from: 'categories',
          localField: 'category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $sort: { date: -1 }
      },
      {
        $limit: 5
      },
      {
        $project: {
          amount: 1,
          description: 1,
          date: 1,
          category: 1,
          paidBy: 1,
          isSplit: 1,
          categoryName: { $arrayElemAt: ['$categoryDetails.name', 0] }
        }
      }
    ]).toArray();

    // Get users list (hardcoded for now, but could be from database)
    const users = [
      { id: 'saket', name: 'Saket' },
      { id: 'ayush', name: 'Ayush' }
    ];

    return NextResponse.json({
      success: true,
      data: {
        totalExpenses: Math.round(totalExpenses * 100) / 100,
        totalExpenseCount,
        thisMonthTotal: Math.round(thisMonthTotal * 100) / 100,
        thisMonthCount,
        categoriesCount,
        settlementAmount: Math.round(settlementAmount * 100) / 100,
        settlementMessage,
        users,
        recentExpenses
      }
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch dashboard data' },
      { status: 500 }
    );
  }
}
