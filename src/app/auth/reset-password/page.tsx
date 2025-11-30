/**
 * Reset Password Page
 * Reset password using token from email
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function ResetPasswordPage() {
  const [token, setToken] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const tokenParam = searchParams.get("token");

    if (!tokenParam) {
      setError("No reset token provided");
      setValidating(false);
      return;
    }

    setToken(tokenParam);
    validateToken(tokenParam);
  }, [searchParams]);

  async function validateToken(token: string) {
    try {
      const response = await fetch(`/api/auth/reset-password?token=${token}`);
      const data = await response.json();

      if (data.success && data.valid) {
        setTokenValid(true);
      } else {
        setError(
          data.error || data.message || "Invalid or expired reset token"
        );
      }
    } catch (err) {
      setError("An error occurred while validating the token");    } finally {
      setValidating(false);
    }
  }

  function validatePassword(): boolean {
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return false;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    // Check password strength
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (!hasUpperCase || !hasLowerCase || !hasNumbers || !hasSpecialChar) {
      setError(
        "Password must contain uppercase, lowercase, number, and special character"
      );
      return false;
    }

    return true;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!validatePassword()) {
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setError(data.error || "Failed to reset password");
      }
    } catch (err) {
      setError("An error occurred while resetting your password");    } finally {
      setLoading(false);
    }
  }

  if (validating) {
    return (
      <div className="container">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow">
              <div className="card-body p-5 text-center">
                <div className="spinner-border text-primary mb-4" role="status">
                  <span className="visually-hidden">Validating...</span>
                </div>
                <h3 className="mb-3">Validating Reset Link</h3>
                <p style={{ color: "var(--text-secondary)" }}>Please wait...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!tokenValid) {
    return (
      <div className="container">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow">
              <div className="card-body p-5 text-center">
                <i
                  className="bi bi-x-circle mb-4"
                  style={{ fontSize: "4rem", color: "var(--status-error)" }}
                ></i>
                <h3 className="mb-3">Invalid Reset Link</h3>
                <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                  {error}
                </p>
                <div className="d-grid gap-2">
                  <Link
                    href="/auth/forgot-password"
                    className="btn btn-primary"
                  >
                    Request New Reset Link
                  </Link>
                  <Link href="/login" className="btn btn-outline-secondary">
                    Back to Login
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="container">
        <div className="row justify-content-center align-items-center min-vh-100">
          <div className="col-md-6 col-lg-5">
            <div className="card shadow">
              <div className="card-body p-5 text-center">
                <i
                  className="bi bi-check-circle mb-4"
                  style={{ fontSize: "4rem", color: "var(--status-success)" }}
                ></i>
                <h3 className="mb-3">Password Reset Successful!</h3>
                <p className="mb-4" style={{ color: "var(--text-secondary)" }}>
                  Your password has been changed successfully.
                </p>
                <p
                  className="small mb-4"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Redirecting to login page...
                </p>
                <Link href="/login" className="btn btn-primary">
                  Go to Login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <i
                  className="bi bi-shield-lock text-primary"
                  style={{ fontSize: "3rem" }}
                ></i>
                <h3 className="mt-3">Set New Password</h3>
                <p style={{ color: "var(--text-secondary)" }}>
                  Enter your new password below
                </p>
              </div>

              <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="mb-3">
                  <label htmlFor="password" className="form-label">
                    New Password
                  </label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter new password"
                    required
                    disabled={loading}
                  />
                  <small style={{ color: "var(--text-secondary)" }}>
                    Must be at least 8 characters with uppercase, lowercase,
                    number, and special character
                  </small>
                </div>

                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="form-label">
                    Confirm New Password
                  </label>
                  <input
                    type="password"
                    className="form-control form-control-lg"
                    id="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="d-grid gap-2">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg"
                    disabled={loading || !password || !confirmPassword}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Resetting...
                      </>
                    ) : (
                      "Reset Password"
                    )}
                  </button>

                  <Link href="/login" className="btn btn-outline-secondary">
                    Cancel
                  </Link>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
