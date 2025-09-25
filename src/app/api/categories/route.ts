import { NextRequest, NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';

interface Category {
  _id: string;
  name: string;
  description: string;
  subcategories: string[];
  createdAt: Date;
  updatedAt?: Date;
}

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db('spend-tracker');
    
    const categories = await db.collection<Category>('categories').find({}).toArray();
    
    return NextResponse.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('GET /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch categories' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, subcategories = [] } = body;
    
    if (!name || !description) {
      return NextResponse.json(
        { success: false, error: 'Name and description are required' },
        { status: 400 }
      );
    }
    
    const client = await clientPromise;
    const db = client.db('spend-tracker');
    
    // Generate kebab-case ID from name
    const _id = name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');
    
    const category = {
      _id,
      name,
      description,
      subcategories,
      createdAt: new Date()
    };
    
    await db.collection<Category>('categories').insertOne(category);
    
    return NextResponse.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('POST /api/categories error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create category' },
      { status: 500 }
    );
  }
}
