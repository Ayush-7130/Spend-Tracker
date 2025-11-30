/**
 * Email Verification API Route
 * Verifies user email using the token sent via email
 */

import { NextRequest, NextResponse } from "next/server";
import { hashToken } from "@/lib/auth";
import { dbManager } from "@/lib/database";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Verification token is required" },
        { status: 400 }
      );
    }

    // Hash the token to compare with stored hash
    const hashedToken = hashToken(token);

    // Find user with this token
    const db = await dbManager.getDatabase();
    const user = await db.collection("users").findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: "Invalid or expired verification token" },
        { status: 400 }
      );
    }

    // Check if already verified
    if (user.isEmailVerified) {
      return NextResponse.json(
        { success: true, message: "Email is already verified" },
        { status: 200 }
      );
    }

    // Update user - mark email as verified and clear token
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          isEmailVerified: true,
          updatedAt: new Date(),
        },
        $unset: {
          emailVerificationToken: "",
          emailVerificationExpiry: "",
        },
      }
    );

    // Send welcome email (non-blocking)
    sendWelcomeEmail(user.email, user.name).catch((error) => {    });

    return NextResponse.json(
      {
        success: true,
        message:
          "Email verified successfully! You now have full access to all features.",
        data: {
          email: user.email,
          isEmailVerified: true,
        },
      },
      { status: 200 }
    );
  } catch (error) {    return NextResponse.json(
      { success: false, error: "An error occurred during verification" },
      { status: 500 }
    );
  }
}

// GET endpoint to check token validity without verifying
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const token = searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { success: false, error: "Token is required" },
        { status: 400 }
      );
    }

    const hashedToken = hashToken(token);
    const db = await dbManager.getDatabase();

    const user = await db.collection("users").findOne({
      emailVerificationToken: hashedToken,
      emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, valid: false, message: "Invalid or expired token" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        valid: true,
        email: user.email,
      },
      { status: 200 }
    );
  } catch (error) {    return NextResponse.json(
      { success: false, error: "An error occurred" },
      { status: 500 }
    );
  }
}
