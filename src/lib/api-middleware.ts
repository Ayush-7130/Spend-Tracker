/**
 * API Middleware and Utilities
 *
 * Common middleware functions and utilities for Next.js API routes.
 * Provides authentication, error handling, request validation, and response formatting.
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import {
  sanitizeInput,
  sanitizeSearchQuery,
  isValidObjectId,
} from "@/lib/utils/security";

// ===========================================================================
// TYPES
// ===========================================================================

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: Record<string, string>;
}

export interface ApiHandler<T = any> {
  (req: NextRequest, context?: any): Promise<NextResponse<ApiResponse<T>>>;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
}

export interface RequestContext {
  user?: AuthenticatedUser;
  params?: Record<string, string>;
}

// ===========================================================================
// RESPONSE FORMATTERS
// ===========================================================================

/**
 * Format success response with optimized headers
 */
export function successResponse<T>(
  data: T,
  message?: string,
  status: number = 200,
  cacheOptions?: {
    maxAge?: number;
    staleWhileRevalidate?: number;
    etag?: string;
  }
): NextResponse<ApiResponse<T>> {
  const response = NextResponse.json(
    {
      success: true,
      data,
      message,
    },
    { status }
  );

  // Add cache control headers if provided
  if (cacheOptions) {
    const { maxAge = 60, staleWhileRevalidate = 30, etag } = cacheOptions;
    response.headers.set(
      "Cache-Control",
      `public, s-maxage=${maxAge}, stale-while-revalidate=${staleWhileRevalidate}`
    );

    if (etag) {
      response.headers.set("ETag", etag);
    }
  }

  return response;
}

/**
 * Format error response
 */
export function errorResponse(
  error: string | Error,
  status: number = 500,
  errors?: Record<string, string>
): NextResponse<ApiResponse> {
  const errorMessage = error instanceof Error ? error.message : error;

  return NextResponse.json(
    {
      success: false,
      error: errorMessage,
      errors,
    },
    { status }
  );
}

/**
 * Format validation error response
 */
export function validationErrorResponse(
  errors: Record<string, string>
): NextResponse<ApiResponse> {
  return NextResponse.json(
    {
      success: false,
      error: "Validation failed",
      errors,
    },
    { status: 400 }
  );
}

/**
 * Format not found response
 */
export function notFoundResponse(
  message: string = "Resource not found"
): NextResponse<ApiResponse> {
  return errorResponse(message, 404);
}

/**
 * Format unauthorized response
 */
export function unauthorizedResponse(
  message: string = "Unauthorized access"
): NextResponse<ApiResponse> {
  return errorResponse(message, 401);
}

/**
 * Format forbidden response
 */
export function forbiddenResponse(
  message: string = "Access forbidden"
): NextResponse<ApiResponse> {
  return errorResponse(message, 403);
}

// ===========================================================================
// ERROR HANDLING MIDDLEWARE
// ===========================================================================

/**
 * Wrap API handler with error handling
 * Catches all errors and returns formatted error responses
 */
export function withErrorHandling<T = any>(
  handler: ApiHandler<T>
): ApiHandler<T> {
  return async (req: NextRequest, context?: any) => {
    try {
      return await handler(req, context);
    } catch (error) {
      // Handle known error types
      if (error instanceof ValidationError) {
        return validationErrorResponse(error.errors);
      }

      if (error instanceof NotFoundError) {
        return notFoundResponse(error.message);
      }

      if (error instanceof UnauthorizedError) {
        return unauthorizedResponse(error.message);
      }

      if (error instanceof ForbiddenError) {
        return forbiddenResponse(error.message);
      }

      // Handle unknown errors
      const message =
        error instanceof Error ? error.message : "An unexpected error occurred";

      return errorResponse(message, 500);
    }
  };
}

// ===========================================================================
// AUTHENTICATION MIDDLEWARE
// ===========================================================================

/**
 * Require authentication for API route
 * Returns 401 if user is not authenticated
 */
export function withAuth<T = any>(
  handler: (
    req: NextRequest,
    context: RequestContext
  ) => Promise<NextResponse<ApiResponse<T>>>
): ApiHandler<T> {
  return withErrorHandling(async (req: NextRequest, routeContext?: any) => {
    // Get user from JWT token
    const jwtPayload = await getUserFromRequest(req);

    if (!jwtPayload) {
      return unauthorizedResponse("Authentication required");
    }

    const user: AuthenticatedUser = {
      id: jwtPayload.userId,
      email: jwtPayload.email,
      name: jwtPayload.email.split("@")[0], // Extract name from email if not in payload
    };

    const context: RequestContext = {
      user,
      params: routeContext?.params,
    };

    return handler(req, context);
  });
}

// ===========================================================================
// METHOD VALIDATION MIDDLEWARE
// ===========================================================================

/**
 * Validate HTTP method for API route
 * Returns 405 if method is not allowed
 */
export function withMethods<T = any>(
  allowedMethods: string[],
  handler: ApiHandler<T>
): ApiHandler<T> {
  return withErrorHandling(async (req: NextRequest, context?: any) => {
    if (!allowedMethods.includes(req.method)) {
      return NextResponse.json(
        {
          success: false,
          error: `Method ${req.method} not allowed`,
        },
        {
          status: 405,
          headers: {
            Allow: allowedMethods.join(", "),
          },
        }
      );
    }

    return handler(req, context);
  });
}

// ===========================================================================
// REQUEST BODY VALIDATION
// ===========================================================================

/**
 * Validate request body against schema
 */
export async function validateBody<T>(
  req: NextRequest,
  schema: ValidationSchema<T>
): Promise<{ valid: boolean; data?: T; errors?: Record<string, string> }> {
  try {
    const body = await req.json();
    const result = schema.validate(body);

    if (!result.valid) {
      return {
        valid: false,
        errors: result.errors,
      };
    }

    return {
      valid: true,
      data: result.data,
    };
  } catch {
    return {
      valid: false,
      errors: {
        body: "Invalid JSON body",
      },
    };
  }
}

// ===========================================================================
// CUSTOM ERROR CLASSES
// ===========================================================================

export class ValidationError extends Error {
  constructor(public errors: Record<string, string>) {
    super("Validation failed");
    this.name = "ValidationError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Resource not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class UnauthorizedError extends Error {
  constructor(message: string = "Unauthorized") {
    super(message);
    this.name = "UnauthorizedError";
  }
}

export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

// ===========================================================================
// VALIDATION SCHEMA TYPE
// ===========================================================================

export interface ValidationSchema<T> {
  validate: (data: any) => {
    valid: boolean;
    data?: T;
    errors?: Record<string, string>;
  };
}

// ===========================================================================
// UTILITY FUNCTIONS
// ===========================================================================

/**
 * Parse query parameters from request with optional sanitization
 */
export function getQueryParams(
  req: NextRequest,
  sanitize: boolean = true
): Record<string, string> {
  const params: Record<string, string> = {};
  const searchParams = req.nextUrl.searchParams;

  searchParams.forEach((value, key) => {
    params[key] = sanitize ? sanitizeInput(value) : value;
  });

  return params;
}

/**
 * Get single query parameter with optional sanitization
 */
export function getQueryParam(
  req: NextRequest,
  param: string,
  defaultValue?: string,
  sanitize: boolean = true
): string | undefined {
  const value = req.nextUrl.searchParams.get(param) || defaultValue;
  return value && sanitize ? sanitizeInput(value) : value;
}

/**
 * Check if request has valid JSON body
 */
export async function hasValidJsonBody(req: NextRequest): Promise<boolean> {
  try {
    await req.json();
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize search query parameter
 */
export function getSanitizedSearchQuery(req: NextRequest): string {
  const search = req.nextUrl.searchParams.get("search");
  return search ? sanitizeSearchQuery(search) : "";
}

/**
 * Validate and get ObjectId parameter
 */
export function getValidObjectId(
  id: string | undefined,
  paramName: string = "id"
): string {
  if (!id) {
    throw new ValidationError({ [paramName]: `${paramName} is required` });
  }

  if (!isValidObjectId(id)) {
    throw new ValidationError({ [paramName]: `Invalid ${paramName} format` });
  }

  return id;
}

/**
 * Sanitize request body fields
 */
export function sanitizeBodyFields<T extends Record<string, any>>(
  body: T,
  fields: (keyof T)[]
): T {
  const sanitized = { ...body };

  fields.forEach((field) => {
    if (typeof sanitized[field] === "string") {
      sanitized[field] = sanitizeInput(sanitized[field] as string) as any;
    }
  });

  return sanitized;
}

/**
 * Create API route handler with common middleware
 * Combines error handling, method validation, and optional authentication
 */
export function createApiRoute<T = any>(options: {
  methods: string[];
  requireAuth?: boolean;
  handler: (
    req: NextRequest,
    context: RequestContext
  ) => Promise<NextResponse<ApiResponse<T>>>;
}): ApiHandler<T> {
  const { methods, requireAuth = false, handler } = options;

  let wrappedHandler = handler;

  // Apply authentication if required
  if (requireAuth) {
    wrappedHandler = withAuth(handler) as any;
  }

  // Apply method validation
  wrappedHandler = withMethods(methods, wrappedHandler as any) as any;

  return wrappedHandler as ApiHandler<T>;
}

// ===========================================================================
// EXPORTS
// ===========================================================================

const apiMiddleware = {
  // Response formatters
  successResponse,
  errorResponse,
  validationErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  forbiddenResponse,

  // Middleware
  withErrorHandling,
  withAuth,
  withMethods,

  // Utilities
  validateBody,
  getQueryParams,
  getQueryParam,
  hasValidJsonBody,
  createApiRoute,

  // Error classes
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
};

export default apiMiddleware;
