/**
 * Security Utilities
 *
 * Helper functions for security best practices.
 */

// ===========================================================================
// INPUT SANITIZATION
// ===========================================================================

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Sanitize HTML (removes all tags)
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 * Requirements: 8+ chars, 1 uppercase, 1 lowercase, 1 number
 */
export function isValidPassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push("Password must be at least 8 characters long");
  }

  if (!/[A-Z]/.test(password)) {
    errors.push("Password must contain at least one uppercase letter");
  }

  if (!/[a-z]/.test(password)) {
    errors.push("Password must contain at least one lowercase letter");
  }

  if (!/[0-9]/.test(password)) {
    errors.push("Password must contain at least one number");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generate secure random string
 */
export function generateSecureToken(length: number = 32): string {
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  // Fallback for server-side
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ===========================================================================
// SQL/NoSQL INJECTION PREVENTION
// ===========================================================================

/**
 * Escape special characters for MongoDB queries
 */
export function escapeMongoDB(input: string): string {
  if (!input) return "";

  return input
    .replace(/\\/g, "\\\\")
    .replace(/\$/g, "\\$")
    .replace(/\./g, "\\.");
}

/**
 * Validate MongoDB ObjectId format
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize search query
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return "";

  // Remove special regex characters
  return query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ===========================================================================
// CSRF PROTECTION
// ===========================================================================

/**
 * Generate CSRF token
 */
export function generateCsrfToken(): string {
  return generateSecureToken(32);
}

/**
 * Store CSRF token in session storage
 */
export function storeCsrfToken(token: string): void {
  if (typeof window !== "undefined") {
    sessionStorage.setItem("csrf_token", token);
  }
}

/**
 * Get CSRF token from session storage
 */
export function getCsrfToken(): string | null {
  if (typeof window !== "undefined") {
    return sessionStorage.getItem("csrf_token");
  }
  return null;
}

/**
 * Clear CSRF token
 */
export function clearCsrfToken(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("csrf_token");
  }
}

// ===========================================================================
// AUTHENTICATION HELPERS
// ===========================================================================

/**
 * Store JWT token securely
 */
export function storeAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    // Use httpOnly cookies in production
    // For now, using localStorage (should be upgraded to httpOnly cookies)
    localStorage.setItem("token", token);
  }
}

/**
 * Get JWT token
 */
export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

/**
 * Clear JWT token
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}

/**
 * Decode JWT token (without verification)
 */
export function decodeJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    const payload = parts[1];
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(decoded);
  } catch (error) {
    return null;
  }
}

/**
 * Check if JWT token is expired
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return true;

  const now = Date.now() / 1000;
  return decoded.exp < now;
}

// ===========================================================================
// RATE LIMITING (CLIENT-SIDE)
// ===========================================================================

/**
 * Simple client-side rate limiter
 */
export class RateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;

  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the window
    const recentRequests = requests.filter(
      (time) => now - time < this.windowMs
    );

    if (recentRequests.length >= this.maxRequests) {
      return false;
    }

    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  /**
   * Clear rate limit for key
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limits
   */
  clearAll(): void {
    this.requests.clear();
  }
}

// ===========================================================================
// CONTENT SECURITY
// ===========================================================================

/**
 * Check if URL is from allowed domain
 */
export function isAllowedDomain(
  url: string,
  allowedDomains: string[]
): boolean {
  try {
    const urlObj = new URL(url);
    return allowedDomains.some((domain) => urlObj.hostname.endsWith(domain));
  } catch (error) {
    return false;
  }
}

/**
 * Validate file type
 */
export function isAllowedFileType(
  filename: string,
  allowedTypes: string[]
): boolean {
  const extension = filename.split(".").pop()?.toLowerCase();
  return extension ? allowedTypes.includes(extension) : false;
}

/**
 * Validate file size
 */
export function isAllowedFileSize(size: number, maxSizeBytes: number): boolean {
  return size <= maxSizeBytes;
}

// ===========================================================================
// HEADERS SECURITY
// ===========================================================================

/**
 * Create secure headers for API requests
 */
export function createSecureHeaders(includeAuth: boolean = true): HeadersInit {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    "X-Requested-With": "XMLHttpRequest",
  };

  if (includeAuth) {
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  }

  const csrfToken = getCsrfToken();
  if (csrfToken) {
    headers["X-CSRF-Token"] = csrfToken;
  }

  return headers;
}

// ===========================================================================
// SENSITIVE DATA MASKING
// ===========================================================================

/**
 * Mask email address
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes("@")) return email;

  const [username, domain] = email.split("@");
  const maskedUsername =
    username.length > 2
      ? username.charAt(0) +
        "*".repeat(username.length - 2) +
        username.charAt(username.length - 1)
      : username;

  return `${maskedUsername}@${domain}`;
}

/**
 * Mask credit card number
 */
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber) return "";

  const cleaned = cardNumber.replace(/\s/g, "");
  if (cleaned.length < 4) return cardNumber;

  return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
}

/**
 * Mask phone number
 */
export function maskPhoneNumber(phone: string): string {
  if (!phone) return "";

  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.length < 4) return phone;

  return "*".repeat(cleaned.length - 4) + cleaned.slice(-4);
}

// ===========================================================================
// LOGGING SECURITY
// ===========================================================================

/**
 * Safely log object (removes sensitive fields)
 */
export function safeLog(
  obj: any,
  sensitiveFields: string[] = ["password", "token", "apiKey"]
): any {
  if (!obj || typeof obj !== "object") return obj;

  const safe = { ...obj };

  sensitiveFields.forEach((field) => {
    if (field in safe) {
      safe[field] = "[REDACTED]";
    }
  });

  return safe;
}

// ===========================================================================
// EXPORT
// ===========================================================================

export default {
  sanitizeInput,
  stripHtml,
  isValidEmail,
  isValidPassword,
  generateSecureToken,
  escapeMongoDB,
  isValidObjectId,
  sanitizeSearchQuery,
  generateCsrfToken,
  storeCsrfToken,
  getCsrfToken,
  clearCsrfToken,
  storeAuthToken,
  getAuthToken,
  clearAuthToken,
  decodeJwt,
  isTokenExpired,
  RateLimiter,
  isAllowedDomain,
  isAllowedFileType,
  isAllowedFileSize,
  createSecureHeaders,
  maskEmail,
  maskCreditCard,
  maskPhoneNumber,
  safeLog,
};
