import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { getUserFromRequest } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ name: string }> }
) {
  // Check authentication
  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Authentication required' },
      { status: 401 }
    );
  }

  try {
    const { name } = await params;
    const userName = name;
    
    if (!userName || (userName !== 'saket' && userName !== 'ayush')) {
      return NextResponse.json(
        { success: false, error: 'Invalid user name' },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db('spend-tracker');

    // Get user's category distribution (including both expenses paid by user and their share of split expenses)
    const categoryDistribution = await db.collection('expenses').aggregate([
      {
        $match: {
          $or: [
            { paidBy: userName },
            { 
              isSplit: true,
              $or: [
                { [`splitDetails.${userName}Amount`]: { $exists: true } },
                { paidBy: { $ne: userName } } // Include split expenses not paid by this user
              ]
            }
          ]
        }
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
        $addFields: {
          userAmount: {
            $cond: [
              { $eq: ['$isSplit', true] },
              // If split, use user's split amount
              { $ifNull: [`$splitDetails.${userName}Amount`, 0] },
              // If not split, check if user paid
              {
                $cond: [
                  { $eq: ['$paidBy', userName] },
                  '$amount', // User paid for non-split expense
                  0 // User didn't pay for non-split expense
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          userAmount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: '$category',
          amount: { $sum: '$userAmount' },
          count: { $sum: 1 },
          categoryName: { $first: { $arrayElemAt: ['$categoryDetails.name', 0] } }
        }
      },
      {
        $sort: { amount: -1 }
      },
      {
        $project: {
          name: { $ifNull: ['$categoryName', 'Uncategorized'] },
          amount: 1,
          count: 1
        }
      }
    ]).toArray();

    // Get monthly spending trends (last 12 months) including split expenses
    const now = new Date();
    const oneYearAgo = new Date(now.getFullYear() - 1, now.getMonth(), 1);
    
    const monthlyTrends = await db.collection('expenses').aggregate([
      {
        $match: {
          $or: [
            { paidBy: userName },
            { 
              isSplit: true,
              $or: [
                { [`splitDetails.${userName}Amount`]: { $exists: true } },
                { paidBy: { $ne: userName } }
              ]
            }
          ],
          date: {
            $gte: oneYearAgo,
            $lte: now
          }
        }
      },
      {
        $addFields: {
          userAmount: {
            $cond: [
              { $eq: ['$isSplit', true] },
              // If split, use user's split amount
              { $ifNull: [`$splitDetails.${userName}Amount`, 0] },
              // If not split, check if user paid
              {
                $cond: [
                  { $eq: ['$paidBy', userName] },
                  '$amount', // User paid for non-split expense
                  0 // User didn't pay for non-split expense
                ]
              }
            ]
          }
        }
      },
      {
        $match: {
          userAmount: { $gt: 0 }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$date' }
          },
          amount: { $sum: '$userAmount' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]).toArray();

    // Get category breakdown with percentages (already includes split expenses from categoryDistribution)
    const totalAmount = categoryDistribution.reduce((sum, cat) => sum + cat.amount, 0);
    const categoryBreakdown = categoryDistribution.map(cat => ({
      category: cat.name,
      amount: Math.round(cat.amount * 100) / 100,
      count: cat.count,
      percentage: totalAmount > 0 ? Math.round((cat.amount / totalAmount) * 10000) / 100 : 0
    }));

    // Get split expenses for this user
    const userSplitExpenses = await db.collection('expenses').aggregate([
      {
        $match: { 
          isSplit: true,
          $or: [
            { paidBy: userName },
            { [`splitDetails.${userName}Amount`]: { $exists: true } }
          ]
        }
      },
      {
        $project: {
          description: 1,
          amount: 1,
          date: 1,
          paidBy: 1,
          splitDetails: 1,
          userPaid: {
            $cond: [
              { $eq: ['$paidBy', userName] },
              '$amount',
              0
            ]
          },
          userShare: {
            $ifNull: [`$splitDetails.${userName}Amount`, { $divide: ['$amount', 2] }]
          }
        }
      },
      {
        $sort: { date: -1 }
      },
      {
        $limit: 10
      }
    ]).toArray();

    // Calculate balance information using the same logic as settlements/balance API
    
    // Get all split expenses
    const splitExpenses = await db.collection('expenses')
      .find({ isSplit: true })
      .toArray();

    // Get all settlements
    const settlements = await db.collection('settlements')
      .find({})
      .toArray();

    // Calculate balances for each user pair
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
    
    // Calculate net balances
    const saketOwesAyush = (balances['Saket_to_Ayush'] || 0);
    const ayushOwesSaket = (balances['Ayush_to_Saket'] || 0);
    
    // Calculate net difference
    const netBalance = ayushOwesSaket - saketOwesAyush;
    
    // Calculate user-specific values
    const totalPaid = await db.collection('expenses').aggregate([
      {
        $match: { paidBy: userName }
      },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' }
        }
      }
    ]).toArray();

    const userTotalPaid = totalPaid[0]?.total || 0;
    
    // Calculate what this user owes or is owed
    let userOwed = 0;
    let userOwing = 0;
    let status = 'Settled';
    
    if (userName.toLowerCase() === 'saket') {
      if (netBalance > 0) {
        // Ayush owes Saket
        userOwed = netBalance;
        status = `Ayush owes ₹${Math.abs(netBalance).toFixed(2)}`;
      } else if (netBalance < 0) {
        // Saket owes Ayush
        userOwing = Math.abs(netBalance);
        status = `Owes ₹${Math.abs(netBalance).toFixed(2)}`;
      }
    } else if (userName.toLowerCase() === 'ayush') {
      if (netBalance > 0) {
        // Ayush owes Saket
        userOwing = netBalance;
        status = `Owes ₹${Math.abs(netBalance).toFixed(2)}`;
      } else if (netBalance < 0) {
        // Saket owes Ayush
        userOwed = Math.abs(netBalance);
        status = `Saket owes ₹${Math.abs(netBalance).toFixed(2)}`;
      }
    }

    const userNetBalance = userOwed - userOwing;

    // Create individual balances object for frontend display
    const individualBalances: Record<string, number> = {};
    
    if (userName.toLowerCase() === 'saket') {
      if (netBalance !== 0) {
        individualBalances['ayush'] = -netBalance; // Negative means Saket owes Ayush
      }
    } else if (userName.toLowerCase() === 'ayush') {
      if (netBalance !== 0) {
        individualBalances['saket'] = netBalance; // Positive means Saket owes Ayush
      }
    }

    const userData = {
      user: userName,
      categoryDistribution: {
        labels: categoryDistribution.map(cat => cat.name),
        amounts: categoryDistribution.map(cat => Math.round(cat.amount * 100) / 100)
      },
      monthlyTrends: {
        months: monthlyTrends.map(m => {
          const date = new Date(m._id + '-01');
          return date.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
        }),
        amounts: monthlyTrends.map(m => Math.round(m.amount * 100) / 100)
      },
      categoryBreakdown,
      splitExpenses: userSplitExpenses.map(exp => ({
        _id: exp._id.toString(),
        description: exp.description,
        amount: Math.round(exp.amount * 100) / 100,
        date: exp.date.toISOString().split('T')[0],
        userShare: Math.round(exp.userShare * 100) / 100,
        userPaid: Math.round(exp.userPaid * 100) / 100
      })),
      balance: {
        totalPaid: Math.round(userTotalPaid * 100) / 100,
        totalOwed: Math.round(userOwed * 100) / 100,
        totalOwing: Math.round(userOwing * 100) / 100,
        netBalance: Math.round(userNetBalance * 100) / 100,
        status,
        balances: individualBalances
      }
    };

    return NextResponse.json({
      success: true,
      data: userData
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Failed to fetch user analytics data' },
      { status: 500 }
    );
  }
}
