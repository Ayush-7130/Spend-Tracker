/**
 * Email Verification Page
 * Verifies user email via token from URL
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

export default function VerifyEmailPage() {
  const [status, setStatus] = useState<"verifying" | "success" | "error">(
    "verifying"
  );
  const [message, setMessage] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("No verification token provided");
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  async function verifyEmail(token: string) {
    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });

      const data = await response.json();

      if (data.success) {
        setStatus("success");
        setMessage("Your email has been verified successfully!");

        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push("/login");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error || "Email verification failed");
      }
    } catch (err) {
      setStatus("error");
      setMessage("An error occurred during verification");    }
  }

  return (
    <div className="container">
      <div className="row justify-content-center align-items-center min-vh-100">
        <div className="col-md-6 col-lg-5">
          <div className="card shadow">
            <div className="card-body p-5 text-center">
              {status === "verifying" && (
                <>
                  <div
                    className="spinner-border text-primary mb-4"
                    role="status"
                  >
                    <span className="visually-hidden">Verifying...</span>
                  </div>
                  <h3 className="mb-3">Verifying Your Email</h3>
                  <p style={{ color: "var(--text-secondary)" }}>
                    Please wait while we verify your email address...
                  </p>
                </>
              )}

              {status === "success" && (
                <>
                  <div className="mb-4">
                    <i
                      className="bi bi-check-circle"
                      style={{
                        fontSize: "4rem",
                        color: "var(--status-success)",
                      }}
                    ></i>
                  </div>
                  <h3 className="mb-3">Email Verified!</h3>
                  <p
                    className="mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {message}
                  </p>
                  <p
                    className="small"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Redirecting to login page...
                  </p>
                  <Link href="/login" className="btn btn-primary">
                    Go to Login
                  </Link>
                </>
              )}

              {status === "error" && (
                <>
                  <div className="mb-4">
                    <i
                      className="bi bi-x-circle"
                      style={{ fontSize: "4rem", color: "var(--status-error)" }}
                    ></i>
                  </div>
                  <h3 className="mb-3">Verification Failed</h3>
                  <p
                    className="mb-4"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {message}
                  </p>
                  <div className="d-grid gap-2">
                    <Link href="/login" className="btn btn-primary">
                      Go to Login
                    </Link>
                    <Link href="/signup" className="btn btn-outline-secondary">
                      Create New Account
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
