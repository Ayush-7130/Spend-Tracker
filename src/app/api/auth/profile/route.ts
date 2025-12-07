/**
 * Profile API Route
 *
 * Handles user profile retrieval and updates.
 *
 * GET: Retrieve current user's profile
 * PUT: Update user profile (name, email)
 */

import { NextResponse } from "next/server";
import { dbManager } from "@/lib/database";
import { createApiRoute } from "@/lib/api-middleware";
import { isValidEmail } from "@/lib/auth";

// GET: Retrieve current user's profile
const handleGetProfile = createApiRoute({
  methods: ["GET"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;

      // Fetch user from database
      const userDoc = await dbManager.getUserByEmail(user.email);

      if (!userDoc) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: {
          id: userDoc._id.toString(),
          name: userDoc.name,
          email: userDoc.email,
          role: userDoc.role || "user",
          createdAt: userDoc.createdAt,
          updatedAt: userDoc.updatedAt,
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to retrieve profile" },
        { status: 500 }
      );
    }
  },
});

// PUT: Update user profile
const handlePutProfile = createApiRoute({
  methods: ["PUT"],
  requireAuth: true,
  handler: async (request, context) => {
    try {
      const user = context.user!;
      const body = await request.json();
      const { name, email } = body;

      // SECURITY: If email is being changed, check if session has been active for at least 24 hours
      // This prevents immediate malicious email changes from newly compromised accounts
      const emailChangeAttempt =
        email !== undefined && email.trim() !== user.email;

      if (emailChangeAttempt) {
        const accessToken = request.cookies.get("accessToken")?.value;
        const { checkSessionAge } = await import("@/lib/auth");
        const sessionAgeCheck = await checkSessionAge(user.id, accessToken, 24);

        if (!sessionAgeCheck.isValid) {
          return NextResponse.json(
            {
              success: false,
              error: `Cannot change email: ${sessionAgeCheck.message}`,
              sessionAge: sessionAgeCheck.sessionAge,
              requiredAge: sessionAgeCheck.requiredAge,
            } as any,
            { status: 403 } // Forbidden
          );
        }
      }

      // Validation
      const errors: Record<string, string> = {};

      if (name !== undefined) {
        if (!name || name.trim().length < 2) {
          errors.name = "Name must be at least 2 characters long";
        }
      }

      if (email !== undefined) {
        if (!email || !isValidEmail(email)) {
          errors.email = "Invalid email format";
        }
      }

      if (Object.keys(errors).length > 0) {
        return NextResponse.json({ success: false, errors }, { status: 400 });
      }

      // Check if email is already taken by another user
      if (email !== undefined && email.trim() !== user.email) {
        const existingUser = await dbManager.getUserByEmail(email.trim());

        if (existingUser) {
          return NextResponse.json(
            { success: false, error: "Email already in use" },
            { status: 400 }
          );
        }
      }

      // Build update object
      const db = await dbManager.getDatabase();
      const updateData: any = {
        updatedAt: new Date(),
      };

      if (name !== undefined) {
        updateData.name = name.trim();
      }

      const emailChanged = email !== undefined && email.trim() !== user.email;
      if (emailChanged) {
        updateData.email = email.trim();
      }

      // Update user in database
      const result = await db
        .collection("users")
        .findOneAndUpdate(
          { email: user.email },
          { $set: updateData },
          { returnDocument: "after" }
        );

      if (!result) {
        return NextResponse.json(
          { success: false, error: "User not found" },
          { status: 404 }
        );
      }

      // SECURITY: If email changed, revoke all other sessions
      // This prevents unauthorized access if email was compromised
      let sessionsRevoked = 0;
      if (emailChanged) {
        const { revokeAllSessions } = await import("@/lib/auth");
        sessionsRevoked = await revokeAllSessions(user.id, "email_change");

        // Log security event
        await db.collection("securityLogs").insertOne({
          userId: user.id,
          eventType: "email_change",
          description: `Email changed from ${user.email} to ${email.trim()}`,
          metadata: {
            oldEmail: user.email,
            newEmail: email.trim(),
            sessionsRevoked,
          },
          timestamp: new Date(),
        });
      }

      return NextResponse.json({
        success: true,
        message: emailChanged
          ? `Profile updated successfully. ${sessionsRevoked} session(s) logged out for security.`
          : "Profile updated successfully",
        data: {
          id: result._id.toString(),
          name: result.name,
          email: result.email,
          role: result.role || "user",
          createdAt: result.createdAt,
          updatedAt: result.updatedAt,
          sessionsRevoked: emailChanged ? sessionsRevoked : 0,
        },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: "Failed to update profile" },
        { status: 500 }
      );
    }
  },
});

// Export route handlers
export const GET = handleGetProfile;
export const PUT = handlePutProfile;
