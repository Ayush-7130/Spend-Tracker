/**
 * Forgot Password Page
 * Request password reset email
 */

"use client";

import { useState } from "react";
import Link from "next/link";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess(true);
      } else {
        // Even on error, show success message for security
        // (prevents email enumeration)
        setSuccess(true);
      }
    } catch {
      setSuccess(true); // Show success even on error    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow">
            <div className="card-body p-5">
              <div className="text-center mb-4">
                <i
                  className="bi bi-key text-primary"
                  style={{ fontSize: "3rem" }}
                ></i>
                <h3 className="mt-3">Reset Password</h3>
                <p style={{ color: "var(--text-secondary)" }}>
                  {success
                    ? "We've sent you an email"
                    : "Enter your email to receive reset instructions"}
                </p>
              </div>

              {success ? (
                <div>
                  <div className="alert alert-success">
                    <i className="bi bi-envelope-check me-2"></i>
                    If an account exists with that email, you will receive
                    password reset instructions shortly.
                  </div>

                  <p
                    className="small mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Please check your email inbox (and spam folder) for a
                    password reset link. The link will expire in 1 hour.
                  </p>

                  <div className="d-grid gap-2">
                    <Link href="/login" className="btn btn-primary">
                      Back to Login
                    </Link>
                    <button
                      className="btn btn-outline-secondary"
                      onClick={() => {
                        setSuccess(false);
                        setEmail("");
                      }}
                    >
                      Try Another Email
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {error && <div className="alert alert-danger">{error}</div>}

                  <div className="mb-4">
                    <label htmlFor="email" className="form-label">
                      Email Address
                    </label>
                    <input
                      type="email"
                      className="form-control form-control-lg"
                      id="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      required
                      disabled={loading}
                    />
                  </div>

                  <div className="d-grid gap-2">
                    <button
                      type="submit"
                      className="btn btn-primary btn-lg"
                      disabled={loading || !email}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Sending...
                        </>
                      ) : (
                        "Send Reset Link"
                      )}
                    </button>

                    <Link href="/login" className="btn btn-outline-secondary">
                      Back to Login
                    </Link>
                  </div>
                </form>
              )}

              <div className="text-center mt-4">
                <small style={{ color: "var(--text-secondary)" }}>
                  Don&apos;t have an account?{" "}
                  <Link href="/signup">Sign up</Link>
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
