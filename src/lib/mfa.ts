/**
 * Multi-Factor Authentication (MFA) Utilities
 * Implements TOTP-based 2FA using speakeasy
 */

import * as speakeasy from "speakeasy";
import * as QRCode from "qrcode";
import * as crypto from "crypto";

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

/**
 * Generate MFA secret and QR code for user to scan
 */
export async function generateMFASecret(
  email: string,
  appName: string = "Spend Tracker"
): Promise<MFASetup> {
  // Generate secret
  const secret = speakeasy.generateSecret({
    name: `${appName} (${email})`,
    length: 32,
  });

  // Generate QR code
  const qrCode = await QRCode.toDataURL(secret.otpauth_url as string);

  // Generate backup codes
  const backupCodes = generateBackupCodes(10);

  return {
    secret: secret.base32,
    qrCode,
    backupCodes,
  };
}

/**
 * Verify MFA token
 */
export function verifyMFAToken(token: string, secret: string): boolean {
  return speakeasy.totp.verify({
    secret,
    encoding: "base32",
    token,
    window: 2, // Allow 2 time steps before and after
  });
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, backupCodes: string[]): boolean {
  const hashedCode = hashBackupCode(code);
  return backupCodes.includes(hashedCode);
}

/**
 * Generate backup codes
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character alphanumeric code
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    const formattedCode = `${code.slice(0, 4)}-${code.slice(4)}`;

    // Store hashed version
    codes.push(hashBackupCode(formattedCode));
  }

  return codes;
}

/**
 * Hash backup code for storage
 */
function hashBackupCode(code: string): string {
  return crypto.createHash("sha256").update(code).digest("hex");
}

/**
 * Remove used backup code from array
 */
export function removeBackupCode(
  code: string,
  backupCodes: string[]
): string[] {
  const hashedCode = hashBackupCode(code);
  return backupCodes.filter((bc) => bc !== hashedCode);
}

/**
 * Format backup codes for display
 */
export function formatBackupCodesForDisplay(count: number = 10): string[] {
  const displayCodes: string[] = [];

  for (let i = 0; i < count; i++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase();
    displayCodes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return displayCodes;
}
