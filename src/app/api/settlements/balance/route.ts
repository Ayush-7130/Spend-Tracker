import { NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

export async function GET() {
  try {
    await client.connect();
    const db = client.db('spend-tracker');
    
    // Get all split expenses from expenses collection
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
    
    // Calculate net balances (show only one row per user pair)
    const saketOwesAyush = (balances['Saket_to_Ayush'] || 0);
    const ayushOwesSaket = (balances['Ayush_to_Saket'] || 0);
    
    // Calculate net difference
    const netBalance = ayushOwesSaket - saketOwesAyush;
    
    const userBalances: Array<{
      fromUser: string;
      toUser: string;
      amount: number;
      status: 'owes' | 'settled';
    }> = [];
    
    // Show only one net balance row
    if (Math.abs(netBalance) > 0.01) {
      if (netBalance > 0) {
        // Ayush owes Saket (net)
        userBalances.push({
          fromUser: 'Ayush',
          toUser: 'Saket',
          amount: Math.round(netBalance * 100) / 100,
          status: 'owes'
        });
      } else {
        // Saket owes Ayush (net)
        userBalances.push({
          fromUser: 'Saket',
          toUser: 'Ayush',
          amount: Math.round(Math.abs(netBalance) * 100) / 100,
          status: 'owes'
        });
      }
    }
    
    // Calculate summary statistics
    const totalOwed = userBalances
      .filter(b => b.status === 'owes')
      .reduce((sum, b) => sum + b.amount, 0);
    
    const totalSettled = settlements.reduce((sum, s) => sum + s.amount, 0);
    
    return NextResponse.json({
      balances: userBalances,
      summary: {
        totalOwed: Math.round(totalOwed * 100) / 100,
        totalSettled: Math.round(totalSettled * 100) / 100,
        totalTransactions: settlements.length,
        activeBalances: userBalances.filter(b => b.status === 'owes').length
      }
    });
  } catch (error) {
    console.error('Error calculating settlement balances:', error);
    return NextResponse.json({ error: 'Failed to calculate balances' }, { status: 500 });
  } finally {
    await client.close();
  }
}
