/**
 * Error Boundary Component
 *
 * Catches JavaScript errors anywhere in the component tree,
 * logs errors, and displays a fallback UI.
 *
 * Usage:
 * ```tsx
 * <ErrorBoundary fallback={<ErrorFallback />}>
 *   <YourComponent />
 * </ErrorBoundary>
 * ```
 */

"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";

export interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Log error to console

    // Update state with error info
    this.setState({
      errorInfo,
    });

    // Call custom error handler if provided
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // You could also log to an error reporting service here
    // logErrorToService(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
  };

  render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default fallback UI
      return (
        <DefaultErrorFallback
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onReset={this.handleReset}
        />
      );
    }

    return this.props.children;
  }
}

// ===========================================================================
// DEFAULT ERROR FALLBACK
// ===========================================================================

interface DefaultErrorFallbackProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onReset: () => void;
}

function DefaultErrorFallback({
  error,
  errorInfo,
  onReset,
}: DefaultErrorFallbackProps) {
  const isDevelopment = process.env.NODE_ENV === "development";

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="card border-danger">
            <div className="card-header bg-danger text-white">
              <h4 className="mb-0">
                <i className="bi bi-exclamation-triangle-fill me-2"></i>
                Something went wrong
              </h4>
            </div>
            <div className="card-body">
              <p className="lead mb-4">
                We&apos;re sorry, but something unexpected happened. Please try
                refreshing the page.
              </p>{" "}
              {isDevelopment && error && (
                <div className="alert alert-warning">
                  <h6 className="alert-heading">
                    <i className="bi bi-bug me-2"></i>
                    Development Error Details
                  </h6>
                  <hr />
                  <p className="mb-2">
                    <strong>Error:</strong> {error.message}
                  </p>
                  <details className="mb-0">
                    <summary className="cursor-pointer">
                      <strong>Stack Trace</strong>
                    </summary>
                    <pre
                      className="mt-2 p-3 bg-light border rounded"
                      style={{ fontSize: "0.875rem", overflowX: "auto" }}
                    >
                      {error.stack}
                    </pre>
                  </details>
                  {errorInfo && (
                    <details className="mt-3 mb-0">
                      <summary className="cursor-pointer">
                        <strong>Component Stack</strong>
                      </summary>
                      <pre
                        className="mt-2 p-3 bg-light border rounded"
                        style={{ fontSize: "0.875rem", overflowX: "auto" }}
                      >
                        {errorInfo.componentStack}
                      </pre>
                    </details>
                  )}
                </div>
              )}
              <div className="d-flex gap-3">
                <button
                  className="btn btn-primary"
                  onClick={() => window.location.reload()}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Reload Page
                </button>
                <button className="btn btn-outline-secondary" onClick={onReset}>
                  <i className="bi bi-x-circle me-2"></i>
                  Try Again
                </button>
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => window.history.back()}
                >
                  <i className="bi bi-arrow-left me-2"></i>
                  Go Back
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-muted">
            <p>If this problem persists, please contact support.</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ===========================================================================
// CUSTOM ERROR FALLBACK COMPONENTS
// ===========================================================================

/**
 * Simple error fallback for inline components
 */
export function SimpleErrorFallback({ onReset }: { onReset?: () => void }) {
  return (
    <div className="alert alert-danger d-flex align-items-center justify-content-between">
      <div>
        <i className="bi bi-exclamation-circle me-2"></i>
        <strong>Error:</strong> Something went wrong loading this content.
      </div>
      {onReset && (
        <button className="btn btn-sm btn-outline-danger" onClick={onReset}>
          Try Again
        </button>
      )}
    </div>
  );
}

/**
 * Card-style error fallback
 */
export function CardErrorFallback({
  message,
  onReset,
}: {
  message?: string;
  onReset?: () => void;
}) {
  return (
    <div className="card border-danger">
      <div className="card-body text-center py-5">
        <i
          className="bi bi-exclamation-triangle text-danger"
          style={{ fontSize: "3rem" }}
        ></i>
        <h5 className="mt-3 mb-2">Unable to load content</h5>
        <p className="text-muted mb-3">
          {message || "An error occurred while loading this content."}
        </p>
        {onReset && (
          <button className="btn btn-outline-primary" onClick={onReset}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

export default ErrorBoundary;
