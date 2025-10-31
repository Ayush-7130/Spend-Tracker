import { NextRequest, NextResponse } from 'next/server';
import { verifyPassword, generateToken, isValidEmail } from '@/lib/auth';
import { dbManager } from '@/lib/database';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = false } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      );
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Please enter a valid email address' },
        { status: 400 }
      );
    }

    // Find user by email
    const user = await dbManager.getUserByEmail(email.toLowerCase());
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Verify password
    const isValidPassword = await verifyPassword(password, user.passwordHash);
    if (!isValidPassword) {
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      );
    }

    // Generate JWT token
    const token = generateToken({
      userId: user._id,
      email: user.email,
      role: user.role
    });

    // Prepare response
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _, ...userResponse } = user;
    
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      data: {
        user: userResponse,
        token
      }
    });

    // Set HTTP-only cookie for enhanced security
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict' as const,
      maxAge: rememberMe ? 7 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000, // 7 days or 1 day
      path: '/'
    };

    response.cookies.set('auth-token', token, cookieOptions);

    return response;

  } catch (error) {
    console.error('Login error:', error);
    
    // Handle specific MongoDB connection errors
    if (error instanceof Error) {
      const errorMessage = error.message;
      
      // Check for MongoDB connection timeout errors
      if (errorMessage.includes('ETIMEDOUT') || errorMessage.includes('MongoServerSelectionError')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Database connection failed. Please check your internet connection and try again.' 
          },
          { status: 503 } // Service Unavailable
        );
      }
      
      // Check for MongoDB network errors
      if (errorMessage.includes('MongoNetworkError') || errorMessage.includes('connect ECONNREFUSED')) {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Unable to connect to the database. The service may be temporarily unavailable.' 
          },
          { status: 503 }
        );
      }
    }
    
    // Generic error response
    return NextResponse.json(
      { success: false, error: 'An error occurred during login. Please try again later.' },
      { status: 500 }
    );
  }
}