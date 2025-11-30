/**
 * Email Service using Resend
 * Handles sending transactional emails for authentication flows
 */

import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@spendtracker.com";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

/**
 * Send email using Resend
 */
export async function sendEmail(options: EmailOptions): Promise<boolean> {
  try {
    if (!process.env.RESEND_API_KEY) {      return false;
    }

    const { data, error } = await resend.emails.send({
      from: FROM_EMAIL,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    });

    if (error) {      return false;
    }

    return true;
  } catch (error) {    return false;
  }
}

/**
 * Send email verification email
 */
export async function sendVerificationEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const verificationUrl = `${APP_URL}/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>📧 Verify Your Email</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Thanks for signing up for Spend Tracker! We're excited to have you on board.</p>
          <p>Please verify your email address by clicking the button below:</p>
          <center>
            <a href="${verificationUrl}" class="button">Verify Email Address</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #667eea;">${verificationUrl}</p>
          <p>This link will expire in 24 hours.</p>
          <p><strong>Note:</strong> You can still use your account while unverified, but some features may be limited.</p>
        </div>
        <div class="footer">
          <p>If you didn't create an account, you can safely ignore this email.</p>
          <p>&copy; ${new Date().getFullYear()} Spend Tracker. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
    Hi ${name},

    Thanks for signing up for Spend Tracker!

    Please verify your email address by visiting:
    ${verificationUrl}

    This link will expire in 24 hours.

    If you didn't create an account, you can safely ignore this email.

    - Spend Tracker Team
  `;

  return await sendEmail({
    to: email,
    subject: "Verify your email address",
    html,
    text,
  });
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(
  email: string,
  name: string,
  token: string
): Promise<boolean> {
  const resetUrl = `${APP_URL}/auth/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background: #f5576c;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .warning {
            background: #fff3cd;
            border-left: 4px solid #ffc107;
            padding: 15px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🔐 Reset Your Password</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>We received a request to reset your password for your Spend Tracker account.</p>
          <p>Click the button below to create a new password:</p>
          <center>
            <a href="${resetUrl}" class="button">Reset Password</a>
          </center>
          <p>Or copy and paste this link into your browser:</p>
          <p style="word-break: break-all; color: #f5576c;">${resetUrl}</p>
          <p>This link will expire in 1 hour.</p>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong><br>
            If you didn't request this password reset, please ignore this email or contact support if you're concerned about your account security.
          </div>
        </div>
        <div class="footer">
          <p>For security reasons, this link will expire soon.</p>
          <p>&copy; ${new Date().getFullYear()} Spend Tracker. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
    Hi ${name},

    We received a request to reset your password for your Spend Tracker account.

    Visit this link to create a new password:
    ${resetUrl}

    This link will expire in 1 hour.

    If you didn't request this password reset, please ignore this email.

    - Spend Tracker Team
  `;

  return await sendEmail({
    to: email,
    subject: "Reset your password",
    html,
    text,
  });
}

/**
 * Send welcome email (after email verification)
 */
export async function sendWelcomeEmail(
  email: string,
  name: string
): Promise<boolean> {
  const dashboardUrl = `${APP_URL}/`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            text-align: center;
            border-radius: 8px 8px 0 0;
          }
          .content {
            background: #f9f9f9;
            padding: 30px;
            border-radius: 0 0 8px 8px;
          }
          .button {
            display: inline-block;
            background: #667eea;
            color: white;
            padding: 12px 30px;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
          }
          .footer {
            text-align: center;
            margin-top: 30px;
            color: #666;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🎉 Welcome to Spend Tracker!</h1>
        </div>
        <div class="content">
          <p>Hi ${name},</p>
          <p>Your email has been verified successfully! You now have full access to all features.</p>
          <p>Get started by:</p>
          <ul>
            <li>📊 Adding your first expense</li>
            <li>📁 Creating custom categories</li>
            <li>📈 Viewing your spending analytics</li>
          </ul>
          <center>
            <a href="${dashboardUrl}" class="button">Go to Dashboard</a>
          </center>
        </div>
        <div class="footer">
          <p>Need help? Check out our documentation or contact support.</p>
          <p>&copy; ${new Date().getFullYear()} Spend Tracker. All rights reserved.</p>
        </div>
      </body>
    </html>
  `;

  const text = `
    Hi ${name},

    Welcome to Spend Tracker! Your email has been verified successfully.

    Visit your dashboard: ${dashboardUrl}

    - Spend Tracker Team
  `;

  return await sendEmail({
    to: email,
    subject: "Welcome to Spend Tracker!",
    html,
    text,
  });
}
