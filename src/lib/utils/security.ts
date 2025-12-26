/**
 * Security Utilities
 *
 * Comprehensive security helpers for input validation, sanitization, and protection.
 *
 * Security Layers:
 * 1. Input Sanitization: Prevents XSS by escaping HTML/special characters
 * 2. Validation: Email, password strength, ObjectId format
 * 3. NoSQL Injection Prevention: Escapes MongoDB operators
 * 4. Rate Limiting: Token bucket algorithm for request throttling
 * 5. CSRF Protection: Token generation and validation
 *
 * WHY Multiple Layers:
 * - Defense in depth: Multiple security checks catch different attack vectors
 * - No single point of failure: If one layer fails, others still protect
 * - Different threats require different defenses
 */

// ===========================================================================
// INPUT SANITIZATION - Prevents XSS Attacks
// ===========================================================================

/**
 * Sanitize string input to prevent XSS (Cross-Site Scripting)
 *
 * Escapes HTML special characters that could execute JavaScript:
 * - & becomes &amp; (prevents double-encoding attacks)
 * - < becomes &lt; (prevents <script> injection)
 * - > becomes &gt; (prevents tag closure)
 * - " becomes &quot; (prevents attribute injection)
 * - ' becomes &#x27; (prevents single-quote attribute injection)
 * - / becomes &#x2F; (prevents closing tag injection)
 *
 * WHY Escape Instead of Strip:
 * - Preserves user intent (user might want to discuss HTML in comments)
 * - Safer than regex-based HTML stripping (bypasses are common)
 * - Same approach used by React's dangerouslySetInnerHTML
 */
export function sanitizeInput(input: string): string {
  if (!input) return "";

  return input
    .replace(/&/g, "&amp;") // Must be first to avoid double-escaping
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}

/**
 * Strip all HTML tags from input
 *
 * More aggressive than sanitizeInput - removes ALL markup.
 * Use when HTML is never allowed (e.g., names, email addresses).
 *
 * WHY Simple Regex:
 * - Complex HTML parsing libraries are overkill for simple stripping
 * - This regex catches all tag patterns (opening, closing, self-closing)
 * - Good enough for non-critical use cases (descriptions, comments)
 */
export function stripHtml(html: string): string {
  if (!html) return "";
  return html.replace(/<[^>]*>/g, "");
}

/**
 * Validate email format using RFC 5322 simplified regex
 *
 * Checks: localpart@domain.tld
 * - localpart: anything except whitespace and @
 * - domain: anything except whitespace and @
 * - tld: at least one character after the dot
 *
 * WHY Simple Regex:
 * - Full RFC 5322 validation is complex and overkill
 * - This catches 99% of typos and invalid formats
 * - Server-side email verification (send link) is the real validation
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Validate password strength
 *
 * Requirements aligned with OWASP recommendations:
 * - Minimum 8 characters (balance security vs memorability)
 * - At least 1 uppercase letter (increases entropy)
 * - At least 1 lowercase letter (increases entropy)
 * - At least 1 number (increases entropy)
 *
 * WHY Not Require Special Characters:
 * - Minimal security benefit over length
 * - Users often use predictable patterns (!@# at end)
 * - Focus on length and character diversity instead
 *
 * WHY Return Errors Array:
 * - Better UX: Show all issues at once, not one-by-one
 * - Helps users create compliant passwords faster
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
 * Generate cryptographically secure random token
 *
 * Uses crypto.getRandomValues() for true randomness (not Math.random()).
 *
 * WHY Crypto.getRandomValues:
 * - Math.random() is NOT cryptographically secure (predictable)
 * - crypto.getRandomValues() uses OS-level entropy (truly random)
 * - Critical for tokens, session IDs, CSRF tokens
 *
 * Security: 32 bytes = 256 bits of entropy (unguessable)
 *
 * @param length Number of bytes (default 32 = 256 bits)
 * @returns Hexadecimal string (2 chars per byte, so 64 chars for default)
 */
export function generateSecureToken(length: number = 32): string {
  if (typeof window !== "undefined" && window.crypto) {
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
      ""
    );
  }

  // Fallback for server-side (should use Node's crypto module in production)
  // WARNING: This fallback uses Math.random() which is NOT cryptographically secure
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

// ===========================================================================
// NoSQL INJECTION PREVENTION - MongoDB Specific
// ===========================================================================

/**
 * Escape MongoDB operator characters to prevent NoSQL injection
 *
 * MongoDB operators start with $ (e.g., $ne, $gt, $where)
 * Attackers can inject these to bypass authentication or access unauthorized data
 *
 * Example attack:
 *   { email: "user@example.com", password: { $ne: null } }
 *   This bypasses password check (password not equal to null = always true)
 *
 * WHY Escape $, ., and \:
 * - $: MongoDB operators ($ne, $gt, $where, etc.)
 * - .: Dot notation for nested fields (user.role)
 * - \: Escape character itself (prevents double-escape attacks)
 *
 * BEST PRACTICE: Use this + parameterized queries (never string concatenation)
 */
export function escapeMongoDB(input: string): string {
  if (!input) return "";

  return input
    .replace(/\\/g, "\\\\") // Must be first to avoid double-escaping
    .replace(/\$/g, "\\$")
    .replace(/\./g, "\\.");
}

/**
 * Validate MongoDB ObjectId format (24 hex characters)
 *
 * WHY Validate:
 * - Prevents MongoDB errors from invalid IDs
 * - Early validation improves performance (no database query needed)
 * - Security: Prevents injection of malformed IDs
 *
 * Format: 12-byte hex string = 24 characters (0-9, a-f)
 * Example: "507f1f77bcf86cd799439011"
 */
export function isValidObjectId(id: string): boolean {
  return /^[0-9a-fA-F]{24}$/.test(id);
}

/**
 * Sanitize search query for MongoDB regex queries
 *
 * Escapes regex special characters to prevent regex injection attacks.
 *
 * WHY Escape Regex Characters:
 * - User search input might contain regex metacharacters (., *, +, ?, etc.)
 * - Without escaping, these would be interpreted as regex patterns
 * - Could cause performance issues (catastrophic backtracking)
 * - Could bypass security filters
 *
 * Example:
 *   User searches: "user.*"
 *   Without sanitization: Matches "user", "user123", "username", etc.
 *   With sanitization: Only matches literal "user.*"
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return "";

  // Escape all regex special characters
  return query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ===========================================================================
// CSRF PROTECTION - Token Generation and Validation
// ===========================================================================

/**
 * Generate CSRF token for form submissions
 *
 * CSRF (Cross-Site Request Forgery) Attack:
 * - Attacker tricks user's browser into making unwanted requests
 * - Example: <img src="https://bank.com/transfer?to=attacker&amount=1000">
 * - User's cookies are automatically sent, so request appears legitimate
 *
 * CSRF Token Defense:
 * - Server generates random token, stores in session
 * - Token included in forms (hidden field) and verified server-side
 * - Attacker can't read token (Same-Origin Policy blocks cross-origin reads)
 * - Without valid token, request is rejected
 *
 * WHY 32 bytes:
 * - 256 bits of entropy (unguessable)
 * - Same security level as JWT secrets
 */
export function generateCsrfToken(): string {
  return generateSecureToken(32);
}

/**
 * Store CSRF token in session storage
 *
 * WHY sessionStorage not localStorage:
 * - sessionStorage cleared when tab closes (shorter lifetime)
 * - localStorage persists across sessions (unnecessary for CSRF)
 * - CSRF tokens should be short-lived for security
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
 * Clear CSRF token from session storage
 *
 * Called during logout to invalidate CSRF protection
 */
export function clearCsrfToken(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem("csrf_token");
  }
}

// ===========================================================================
// AUTHENTICATION HELPERS - Client-Side Token Management
// ===========================================================================

/**
 * Store JWT token in localStorage
 *
 * WARNING: This is NOT the primary auth mechanism
 * - Actual auth uses httpOnly cookies (set by server, inaccessible to JavaScript)
 * - This localStorage token is for client-side state management only
 * - Used to check if user is logged in before making API calls
 *
 * WHY localStorage not httpOnly Cookie:
 * - httpOnly cookies can't be read by JavaScript (security feature)
 * - Client needs to know if user is authenticated (for UI rendering)
 * - This token is a COPY of the httpOnly cookie for client convenience
 *
 * Security: Even if stolen from localStorage, attacker can't use it
 * - API requests use httpOnly cookie, not localStorage token
 * - This is just a signal for client-side routing/UI
 */
export function storeAuthToken(token: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("token", token);
  }
}

/**
 * Get JWT token from localStorage
 *
 * Returns copy of httpOnly cookie for client-side state checks
 */
export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token");
  }
  return null;
}

/**
 * Clear JWT token from localStorage on logout
 *
 * Also clears user data to reset client state
 */
export function clearAuthToken(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
  }
}

/**
 * Decode JWT token payload without verification
 *
 * SECURITY WARNING: This does NOT verify token signature
 * - Anyone can create/modify JWT and decode it client-side
 * - NEVER trust decoded data for security decisions
 * - Only use for non-sensitive client-side display (user name, email)
 *
 * WHY Decode Client-Side:
 * - Display user info in UI without API call
 * - Check if token is expired before making requests
 * - Reduce server load for simple UI state
 *
 * JWT Structure: header.payload.signature
 * - header: Algorithm and token type (base64url encoded)
 * - payload: User claims/data (base64url encoded)
 * - signature: Cryptographic signature (only server can verify)
 *
 * @param token JWT string
 * @returns Decoded payload object or null if invalid
 */
export function decodeJwt(token: string): any | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;

    // Extract payload (middle part of JWT)
    const payload = parts[1];

    // Base64url decode (replace URL-safe chars back to standard base64)
    const decoded = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));

    return JSON.parse(decoded);
  } catch {
    return null;
  }
}

/**
 * Check if JWT token is expired based on 'exp' claim
 *
 * WHY Check Client-Side:
 * - Avoid sending requests with expired tokens (saves bandwidth)
 * - Immediate redirect to login (better UX)
 * - Reduce server load (no need to process expired token requests)
 *
 * NOTE: This checks JWT expiry, NOT session expiry
 * - In our system, session can expire before JWT (fixed session model)
 * - Server validates both JWT expiry AND session expiresAt field
 *
 * @param token JWT string
 * @returns true if expired or invalid, false if still valid
 */
export function isTokenExpired(token: string): boolean {
  const decoded = decodeJwt(token);
  if (!decoded || !decoded.exp) return true;

  const now = Date.now() / 1000; // Convert to seconds (JWT exp is in seconds)
  return decoded.exp < now;
}

// ===========================================================================
// RATE LIMITING - Token Bucket Algorithm
// ===========================================================================

/**
 * RateLimiter Class - Prevents Abuse and Brute Force Attacks
 *
 * Implements token bucket algorithm for request throttling.
 *
 * HOW IT WORKS:
 * 1. Track timestamp of each request for a given key (IP, user ID, etc.)
 * 2. Remove timestamps older than time window (sliding window)
 * 3. Allow request if count < maxRequests, otherwise reject
 * 4. Add current timestamp to tracking list
 *
 * EXAMPLE:
 *   Rate Limiter: 5 requests per 15 minutes
 *   User makes requests at: 0min, 1min, 2min, 3min, 4min
 *   5th request allowed (within limit)
 *   6th request at 5min: BLOCKED (5 requests in 15min window)
 *   7th request at 16min: ALLOWED (first request now outside window)
 *
 * WHY Sliding Window:
 * - More accurate than fixed window (no boundary issues)
 * - Fixed window: 5 req at 11:59, 5 req at 12:01 = 10 req in 2min
 * - Sliding window: Always enforces max in any continuous time period
 *
 * USE CASES:
 * - Login attempts (5 per 15 minutes per IP)
 * - Password reset (3 per hour per IP)
 * - API endpoints (30 per minute per user)
 * - Signup (5 per hour per IP)
 *
 * SECURITY BENEFITS:
 * - Prevents brute force password attacks
 * - Mitigates DoS (Denial of Service) attacks
 * - Protects against credential stuffing
 * - Reduces spam and automated abuse
 *
 * @example
 * ```typescript
 * const limiter = new RateLimiter(5, 15 * 60 * 1000); // 5 requests per 15 minutes
 *
 * if (!limiter.isAllowed(clientIP)) {
 *   return res.status(429).json({ error: "Too many requests" });
 * }
 * ```
 */
export class RateLimiter {
  // Map of key -> array of request timestamps
  // Key is typically IP address or user ID
  private requests: Map<string, number[]> = new Map();

  private maxRequests: number; // Maximum requests allowed in window
  private windowMs: number; // Time window in milliseconds

  /**
   * Create new RateLimiter instance
   *
   * @param maxRequests Maximum number of requests allowed in time window
   * @param windowMs Time window in milliseconds (default 60000 = 1 minute)
   */
  constructor(maxRequests: number = 10, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  /**
   * Check if request is allowed under rate limit
   *
   * Algorithm:
   * 1. Get request history for this key (IP, user, etc.)
   * 2. Filter out requests outside the time window (sliding window)
   * 3. Check if remaining requests < maxRequests
   * 4. If allowed, add current timestamp to history
   *
   * WHY Sliding Window:
   * - More fair than fixed window (no burst at window boundaries)
   * - Continuously enforces rate limit over any time period
   *
   * Example:
   *   Rate limit: 5 req/15min
   *   Requests at: 0min, 1min, 2min, 3min, 4min (5 total)
   *   Request at 5min: BLOCKED (5 requests in past 15 minutes)
   *   Request at 16min: ALLOWED (request at 0min now outside window)
   *
   * @param key Identifier for rate limiting (IP address, user ID, etc.)
   * @returns true if request allowed, false if rate limit exceeded
   */
  isAllowed(key: string): boolean {
    const now = Date.now();
    const requests = this.requests.get(key) || [];

    // Remove old requests outside the sliding window
    // This implements the "sliding" part of sliding window algorithm
    const recentRequests = requests.filter(
      (time) => now - time < this.windowMs
    );

    // Check if rate limit exceeded
    if (recentRequests.length >= this.maxRequests) {
      return false; // Too many requests, reject
    }

    // Allow request and record timestamp
    recentRequests.push(now);
    this.requests.set(key, recentRequests);
    return true;
  }

  /**
   * Clear rate limit history for specific key
   *
   * Use cases:
   * - User successfully logs in (reset failed login counter)
   * - Admin manually resets rate limit for user
   * - Testing (reset between test cases)
   *
   * @param key Identifier to clear (IP address, user ID, etc.)
   */
  clear(key: string): void {
    this.requests.delete(key);
  }

  /**
   * Clear all rate limit histories
   *
   * Use cases:
   * - Application restart/reload
   * - Memory cleanup in long-running processes
   * - Testing (reset all rate limits)
   *
   * WARNING: Use sparingly in production
   * - Resets rate limits for all users
   * - Could allow burst of requests if done frequently
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
  } catch {
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

const securityUtils = {
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

export default securityUtils;
