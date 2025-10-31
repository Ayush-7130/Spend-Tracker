import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/auth';
import { dbManager } from '@/lib/database';

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token
    const tokenUser = await getUserFromRequest(request);
    
    if (!tokenUser) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Get fresh user data from database
    const user = await dbManager.getUserById(tokenUser.userId);
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    // Return user data without password hash
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _passwordHash, ...userResponse } = user;
    
    return NextResponse.json({
      success: true,
      data: { user: userResponse }
    });

  } catch (error) {
    console.error('Get current user error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get user information' },
      { status: 500 }
    );
  }
}