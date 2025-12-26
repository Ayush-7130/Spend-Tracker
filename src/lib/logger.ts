/**
 * Structured Logger for Production
 *
 * Provides consistent, secure logging throughout the application.
 * Automatically redacts sensitive information and formats for monitoring services.
 *
 * SECURITY: Never logs passwords, tokens, or other sensitive data.
 * Safe for production use with log aggregation services (Datadog, Sentry, etc.)
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  userId?: string;
  email?: string;
  ip?: string;
  path?: string;
  method?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

/**
 * List of sensitive field names that should be redacted from logs
 *
 * SECURITY: Prevents accidental logging of sensitive data that could
 * compromise user accounts or violate privacy regulations (GDPR, CCPA)
 */
const SENSITIVE_FIELDS = [
  "password",
  "passwordHash",
  "token",
  "refreshToken",
  "accessToken",
  "apiKey",
  "secret",
  "jwt",
  "authorization",
  "mfaSecret",
  "mfaBackupCodes",
  "emailVerificationToken",
  "passwordResetToken",
];

/**
 * Redact sensitive fields from object
 *
 * Recursively scans object and replaces sensitive values with '[REDACTED]'.
 * Protects against accidental logging of credentials or tokens.
 *
 * @param obj - Object to redact
 * @returns New object with sensitive fields redacted
 */
function redactSensitiveData(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }

  // Handle primitive types
  if (typeof obj !== "object") {
    return obj;
  }

  // Handle arrays
  if (Array.isArray(obj)) {
    return obj.map((item) => redactSensitiveData(item));
  }

  // Handle objects
  const redacted: any = {};
  for (const [key, value] of Object.entries(obj)) {
    // Check if field name contains sensitive keywords
    const isSensitive = SENSITIVE_FIELDS.some((field) =>
      key.toLowerCase().includes(field.toLowerCase())
    );

    if (isSensitive) {
      redacted[key] = "[REDACTED]";
    } else if (typeof value === "object") {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Format log entry for output
 *
 * Development: Human-readable console output with colors
 * Production: JSON format for log aggregation services
 *
 * @param entry - Log entry to format
 * @returns Formatted string
 */
function formatLogEntry(entry: LogEntry): string {
  if (process.env.NODE_ENV === "production") {
    // Production: JSON format for log aggregation
    return JSON.stringify(entry);
  }

  // Development: Human-readable format
  const timestamp = new Date(entry.timestamp).toLocaleTimeString();
  const level = entry.level.toUpperCase().padEnd(5);
  const userId = entry.userId ? ` [User: ${entry.userId}]` : "";
  const metadata = entry.metadata ? ` ${JSON.stringify(entry.metadata)}` : "";

  return `[${timestamp}] ${level}${userId} ${entry.message}${metadata}`;
}

/**
 * Core logging function
 *
 * Creates structured log entry with automatic metadata enrichment.
 * Redacts sensitive data before output.
 *
 * @param level - Log severity level
 * @param message - Human-readable log message
 * @param metadata - Additional context (automatically redacted)
 */
export function log(
  level: LogLevel,
  message: string,
  metadata?: Record<string, unknown>
): void {
  // Redact sensitive data from metadata
  const safeMetadata = metadata ? redactSensitiveData(metadata) : undefined;

  const entry: LogEntry = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...safeMetadata,
    metadata: safeMetadata,
  };

  // Output to console with appropriate method
  // Logger implementation requires console methods - intentional usage
  /* eslint-disable no-console */
  const formatted = formatLogEntry(entry);

  switch (level) {
    case "debug":
      if (process.env.NODE_ENV !== "production") {
        console.debug(formatted);
      }
      break;
    case "info":
      console.log(formatted);
      break;
    case "warn":
      console.warn(formatted);
      break;
    case "error":
      console.error(formatted);
      break;
  }
  /* eslint-enable no-console */

  // TODO: Send to external logging service in production
  // if (process.env.NODE_ENV === 'production') {
  //   sendToLoggingService(entry);
  // }
}

/**
 * Log debug information (development only)
 *
 * @param message - Debug message
 * @param metadata - Additional context
 */
export function debug(
  message: string,
  metadata?: Record<string, unknown>
): void {
  log("debug", message, metadata);
}

/**
 * Log general information
 *
 * @param message - Info message
 * @param metadata - Additional context
 */
export function info(
  message: string,
  metadata?: Record<string, unknown>
): void {
  log("info", message, metadata);
}

/**
 * Log warning conditions
 *
 * @param message - Warning message
 * @param metadata - Additional context
 */
export function warn(
  message: string,
  metadata?: Record<string, unknown>
): void {
  log("warn", message, metadata);
}

/**
 * Log error conditions
 *
 * @param message - Error message
 * @param error - Error object (will be redacted and formatted)
 * @param metadata - Additional context
 */
export function error(
  message: string,
  error?: Error | unknown,
  metadata?: Record<string, unknown>
): void {
  const errorMetadata =
    error instanceof Error
      ? {
          errorMessage: error.message,
          errorName: error.name,
          // Only include stack trace in development
          ...(process.env.NODE_ENV !== "production" && { stack: error.stack }),
        }
      : { error };

  log("error", message, {
    ...errorMetadata,
    ...metadata,
  });
}

/**
 * Log authentication events
 *
 * Special logger for security-sensitive authentication events.
 * Includes additional context for audit trails.
 *
 * @param event - Event type (login, logout, failed_login, etc.)
 * @param userId - User ID if applicable
 * @param metadata - Additional context (IP, device, etc.)
 */
export function logAuthEvent(
  event: string,
  userId?: string,
  metadata?: Record<string, unknown>
): void {
  log("info", `Auth event: ${event}`, {
    userId,
    event,
    ...metadata,
  });
}

/**
 * Log API request/response
 *
 * Logs API endpoint access with timing and status information.
 * Useful for monitoring API performance and debugging issues.
 *
 * @param method - HTTP method
 * @param path - Request path
 * @param status - Response status code
 * @param duration - Request duration in milliseconds
 * @param metadata - Additional context
 */
export function logApiRequest(
  method: string,
  path: string,
  status: number,
  duration: number,
  metadata?: Record<string, unknown>
): void {
  const level: LogLevel =
    status >= 500 ? "error" : status >= 400 ? "warn" : "info";

  log(level, `${method} ${path} - ${status}`, {
    method,
    path,
    status,
    duration,
    ...metadata,
  });
}

/**
 * Log database operations
 *
 * Logs database queries and operations for debugging and performance monitoring.
 *
 * @param operation - Database operation type
 * @param collection - MongoDB collection name
 * @param duration - Operation duration in milliseconds
 * @param metadata - Additional context
 */
export function logDatabaseOperation(
  operation: string,
  collection: string,
  duration?: number,
  metadata?: Record<string, unknown>
): void {
  log("debug", `DB ${operation} on ${collection}`, {
    operation,
    collection,
    duration,
    ...metadata,
  });
}

/**
 * Create Express/Next.js compatible request logger
 *
 * Returns a function that logs incoming requests with timing.
 *
 * @returns Request logger function
 */
export function createRequestLogger() {
  return (req: any, res: any, next: any) => {
    const start = Date.now();

    // Log request completion
    res.on("finish", () => {
      const duration = Date.now() - start;
      logApiRequest(req.method, req.path || req.url, res.statusCode, duration, {
        userId: req.userId,
        ip: req.ip || req.headers["x-forwarded-for"],
      });
    });

    next();
  };
}

/**
 * Default logger export
 */
const logger = {
  log,
  debug,
  info,
  warn,
  error,
  logAuthEvent,
  logApiRequest,
  logDatabaseOperation,
  createRequestLogger,
};

export default logger;
