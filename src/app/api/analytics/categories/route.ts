import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('spend-tracker');

    // Get expenses by category with category names
    const categoryAnalysis = await db.collection('expenses').aggregate([
      {
        $group: {
          _id: '$category',
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          count: 1,
          categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] }
        }
      },
      {
        $sort: { totalAmount: -1 }
      }
    ]).toArray();

    // Get expenses by person per category
    const personCategoryAnalysis = await db.collection('expenses').aggregate([
      {
        $group: {
          _id: {
            category: '$category',
            paidBy: '$paidBy'
          },
          totalAmount: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id.category',
          foreignField: '_id',
          as: 'categoryInfo'
        }
      },
      {
        $project: {
          _id: 1,
          totalAmount: 1,
          count: 1,
          categoryName: { $arrayElemAt: ['$categoryInfo.name', 0] }
        }
      },
      {
        $sort: { '_id.category': 1, '_id.paidBy': 1 }
      }
    ]).toArray();

    return NextResponse.json({
      success: true,
      data: {
        categories: categoryAnalysis,
        personCategories: personCategoryAnalysis
      }
    });
  } catch (error) {
    console.error('GET /api/analytics/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch category analytics' },
      { status: 500 }
    );
  }
}
