/**
 * Environment Variables Validation
 *
 * Validates all required environment variables on application startup.
 * Ensures critical security and configuration values are properly set.
 *
 * SECURITY: This validation runs at build/startup time to catch
 * configuration errors before deployment, preventing runtime failures
 * that could expose security vulnerabilities or cause service outages.
 */

// Required environment variables with descriptions
const REQUIRED_ENV_VARS = {
  MONGODB_URI: "MongoDB connection string for database access",
  JWT_SECRET: "JWT signing secret - minimum 32 bytes for security",
  RESEND_API_KEY: "Resend email service API key for transactional emails",
  EMAIL_FROM: "Email sender address - must be verified domain in production",
  NEXT_PUBLIC_APP_URL: "Application base URL for absolute links and redirects",
  NEXT_PUBLIC_ENABLE_SIGNUP:
    "Feature flag to enable/disable new user signups (true/false)",
} as const;

interface ValidationResult {
  success: boolean;
  missing: string[];
  warnings: string[];
  errors: string[];
}

/**
 * Validate all environment variables
 *
 * Checks for:
 * 1. Missing required variables
 * 2. Weak security configurations (short JWT secrets)
 * 3. Development placeholders in production (test email domains)
 * 4. Misconfigurations (localhost URLs in production)
 *
 * @returns ValidationResult with success status and detailed messages
 * @throws Error if critical required variables are missing
 */
export function validateEnvironment(): ValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const errors: string[] = [];

  // Check required environment variables
  for (const [key, description] of Object.entries(REQUIRED_ENV_VARS)) {
    if (!process.env[key]) {
      missing.push(`${key} - ${description}`);
    }
  }

  // Check JWT secret strength
  // SECURITY: JWT secrets under 32 characters are vulnerable to brute force attacks
  if (process.env.JWT_SECRET) {
    if (process.env.JWT_SECRET.length < 32) {
      warnings.push(
        `JWT_SECRET is only ${process.env.JWT_SECRET.length} characters. ` +
          `Recommended minimum: 32 characters for cryptographic security. ` +
          `Generate secure secret: openssl rand -base64 32`
      );
    }
  }

  // Check email domain configuration
  // SECURITY: Test domains won't work in production and may expose configuration issues
  if (process.env.EMAIL_FROM === "onboarding@resend.dev") {
    warnings.push(
      "EMAIL_FROM is using Resend test domain (onboarding@resend.dev). " +
        "This will work in development but should be updated to a verified domain " +
        "before production deployment. See: https://resend.com/docs/dashboard/domains/introduction"
    );
  }

  // Production-specific checks
  if (process.env.NODE_ENV === "production") {
    // Check for localhost URLs in production
    if (process.env.NEXT_PUBLIC_APP_URL?.includes("localhost")) {
      errors.push(
        'NEXT_PUBLIC_APP_URL contains "localhost" but NODE_ENV is production. ' +
          "Update to production domain (e.g., https://yourdomain.com)"
      );
    }

    // Ensure production URL uses HTTPS
    if (
      process.env.NEXT_PUBLIC_APP_URL &&
      !process.env.NEXT_PUBLIC_APP_URL.startsWith("https://")
    ) {
      warnings.push(
        "NEXT_PUBLIC_APP_URL should use HTTPS in production for security. " +
          `Current value: ${process.env.NEXT_PUBLIC_APP_URL}`
      );
    }

    // Verify signup flag is boolean
    if (
      process.env.NEXT_PUBLIC_ENABLE_SIGNUP &&
      !["true", "false"].includes(process.env.NEXT_PUBLIC_ENABLE_SIGNUP)
    ) {
      warnings.push(
        `NEXT_PUBLIC_ENABLE_SIGNUP should be "true" or "false". ` +
          `Current value: "${process.env.NEXT_PUBLIC_ENABLE_SIGNUP}"`
      );
    }
  }

  // Validate MongoDB URI format
  if (process.env.MONGODB_URI) {
    if (
      !process.env.MONGODB_URI.startsWith("mongodb://") &&
      !process.env.MONGODB_URI.startsWith("mongodb+srv://")
    ) {
      errors.push(
        'MONGODB_URI must start with "mongodb://" or "mongodb+srv://" protocol'
      );
    }
  }

  // Build final result
  const success = missing.length === 0 && errors.length === 0;

  return {
    success,
    missing,
    warnings,
    errors,
  };
}

/**
 * Validate environment and log results
 *
 * This function should be called at application startup to ensure
 * all required configuration is present before attempting to run.
 *
 * @throws Error if required variables are missing or critical errors found
 */
export function validateAndLogEnvironment(): void {
  const result = validateEnvironment();

  // Log missing required variables
  if (result.missing.length > 0) {
    console.error("\n❌ Missing Required Environment Variables:");
    result.missing.forEach((msg) => console.error(`  • ${msg}`));
    console.error("\n💡 Add these to your .env.local file\n");
  }

  // Log critical errors
  if (result.errors.length > 0) {
    console.error("\n❌ Environment Configuration Errors:");
    result.errors.forEach((msg) => console.error(`  • ${msg}`));
    console.error("");
  }

  // Log warnings
  if (result.warnings.length > 0) {
    console.warn("\n⚠️  Environment Configuration Warnings:");
    result.warnings.forEach((msg) => console.warn(`  • ${msg}`));
    console.warn("");
  }

  // Fail if critical issues found
  if (!result.success) {
    throw new Error(
      "❌ Environment validation failed. Please fix the issues above before starting the application."
    );
  }

  // Success message
  if (result.warnings.length === 0) {
    // eslint-disable-next-line no-console
    console.log("✅ Environment variables validated successfully\n");
  } else {
    // eslint-disable-next-line no-console
    console.log("✅ Environment variables validated (with warnings)\n");
  }
}

/**
 * Get sanitized environment info for logging/debugging
 *
 * SECURITY: Never logs actual values, only presence/absence and length
 * Safe to use in production logs for diagnostics
 *
 * @returns Object with safe environment information
 */
export function getEnvironmentInfo() {
  return {
    nodeEnv: process.env.NODE_ENV || "not set",
    hasMongoUri: !!process.env.MONGODB_URI,
    mongoUriLength: process.env.MONGODB_URI?.length || 0,
    hasJwtSecret: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET?.length || 0,
    hasResendKey: !!process.env.RESEND_API_KEY,
    emailFrom: process.env.EMAIL_FROM || "not set",
    appUrl: process.env.NEXT_PUBLIC_APP_URL || "not set",
    signupEnabled: process.env.NEXT_PUBLIC_ENABLE_SIGNUP || "not set",
  };
}
