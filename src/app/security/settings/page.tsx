/**
 * Security Settings Page
 * Manage MFA and view login history
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import MainLayout from "@/components/MainLayout";

interface MFAStatus {
  enabled: boolean;
  backupCodesRemaining?: number;
}

interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

interface LoginHistoryItem {
  timestamp: string;
  success: boolean;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  location?: string;
  failureReason?: string;
}

export default function SecuritySettingsPage() {
  const [mfaStatus, setMfaStatus] = useState<MFAStatus | null>(null);
  const [mfaSetup, setMfaSetup] = useState<MFASetup | null>(null);
  const [loginHistory, setLoginHistory] = useState<LoginHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [setupStep, setSetupStep] = useState<
    "idle" | "qr" | "verify" | "backup"
  >("idle");
  const [mfaCode, setMfaCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      setLoading(true);

      // Fetch MFA status
      const mfaResponse = await fetch("/api/auth/mfa/setup", {
        credentials: "include",
      });

      if (mfaResponse.status === 401) {
        router.push("/login");
        return;
      }

      const mfaData = await mfaResponse.json();
      if (mfaData.success) {
        setMfaStatus(mfaData.data);
      }

      // Fetch login history
      const historyResponse = await fetch(
        "/api/security/login-history?limit=10",
        {
          credentials: "include",
        }
      );

      if (historyResponse.ok) {
        const historyData = await historyResponse.json();
        if (historyData.success) {
          setLoginHistory(historyData.data.history);
        }
      }
    } catch (err) {    } finally {
      setLoading(false);
    }
  }

  async function setupMFA() {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch("/api/auth/mfa/setup", {
        method: "POST",
        credentials: "include",
      });

      const data = await response.json();

      if (data.success) {
        setMfaSetup(data.data);
        setSetupStep("qr");
      } else {
        setError(data.error || "Failed to setup MFA");
      }
    } catch (err) {
      setError("An error occurred");    } finally {
      setLoading(false);
    }
  }

  async function verifyMFA() {
    try {
      setError(null);
      setLoading(true);

      const response = await fetch("/api/auth/mfa/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ token: mfaCode }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("MFA enabled successfully!");
        setSetupStep("backup");
        setMfaStatus({
          enabled: true,
          backupCodesRemaining: mfaSetup?.backupCodes.length,
        });
      } else {
        setError(data.error || "Invalid code");
      }
    } catch (err) {
      setError("An error occurred");    } finally {
      setLoading(false);
    }
  }

  async function disableMFA() {
    if (!password) {
      setError("Password is required");
      return;
    }

    if (
      !confirm(
        "Are you sure you want to disable MFA? This will make your account less secure."
      )
    ) {
      return;
    }

    try {
      setError(null);
      setLoading(true);

      const response = await fetch("/api/auth/mfa/disable", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccess("MFA disabled successfully");
        setMfaStatus({ enabled: false });
        setPassword("");
      } else {
        setError(data.error || "Failed to disable MFA");
      }
    } catch (err) {
      setError("An error occurred");    } finally {
      setLoading(false);
    }
  }

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleString();
  }

  if (loading && !mfaStatus) {
    return (
      <MainLayout>
        <div className="container py-5">
          <div className="text-center">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-5">
        <div className="row">
          <div className="col-lg-10 col-xl-8 mx-auto">
            <h1 className="h3 mb-4">Security Settings</h1>

            {/* MFA Section */}
            <div className="card mb-4">
              <div className="card-body">
                <h5 className="card-title">Two-Factor Authentication (2FA)</h5>
                <p style={{ color: "var(--text-secondary)" }}>
                  Add an extra layer of security to your account by requiring a
                  code from your authenticator app when signing in.
                </p>

                {error && <div className="alert alert-danger">{error}</div>}
                {success && (
                  <div className="alert alert-success">{success}</div>
                )}

                {mfaStatus?.enabled ? (
                  <div>
                    <div className="alert alert-success">
                      <i className="bi bi-shield-check me-2"></i>
                      Two-factor authentication is enabled
                      {mfaStatus.backupCodesRemaining !== undefined && (
                        <div className="mt-2 small">
                          Backup codes remaining:{" "}
                          {mfaStatus.backupCodesRemaining}
                        </div>
                      )}
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Password</label>
                      <input
                        type="password"
                        className="form-control"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Enter your password to disable MFA"
                      />
                    </div>

                    <button
                      className="btn btn-danger"
                      onClick={disableMFA}
                      disabled={loading || !password}
                    >
                      {loading ? "Disabling..." : "Disable MFA"}
                    </button>
                  </div>
                ) : setupStep === "idle" ? (
                  <button
                    className="btn btn-primary"
                    onClick={setupMFA}
                    disabled={loading}
                  >
                    {loading
                      ? "Setting up..."
                      : "Enable Two-Factor Authentication"}
                  </button>
                ) : setupStep === "qr" && mfaSetup ? (
                  <div>
                    <h6>Step 1: Scan QR Code</h6>
                    <p
                      className="small"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Scan this QR code with your authenticator app (Google
                      Authenticator, Authy, etc.)
                    </p>

                    <div className="text-center my-3">
                      <Image
                        src={mfaSetup.qrCode}
                        alt="MFA QR Code"
                        width={200}
                        height={200}
                        unoptimized
                      />
                    </div>

                    <p
                      className="small"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Or enter this code manually:{" "}
                      <code>{mfaSetup.secret}</code>
                    </p>

                    <h6 className="mt-4">Step 2: Enter Verification Code</h6>
                    <div className="mb-3">
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Enter 6-digit code"
                        value={mfaCode}
                        onChange={(e) =>
                          setMfaCode(
                            e.target.value.replace(/\D/g, "").slice(0, 6)
                          )
                        }
                        maxLength={6}
                      />
                    </div>

                    <button
                      className="btn btn-primary"
                      onClick={verifyMFA}
                      disabled={loading || mfaCode.length !== 6}
                    >
                      {loading ? "Verifying..." : "Verify and Enable"}
                    </button>
                    <button
                      className="btn btn-outline-secondary ms-2"
                      onClick={() => {
                        setSetupStep("idle");
                        setMfaSetup(null);
                        setMfaCode("");
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                ) : setupStep === "backup" && mfaSetup ? (
                  <div>
                    <h6>Backup Codes</h6>
                    <div className="alert alert-warning">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Save these backup codes in a safe place. You can use them
                      to access your account if you lose your device.
                    </div>

                    <div className="card bg-light">
                      <div className="card-body">
                        <div className="row g-2">
                          {mfaSetup.backupCodes.map((code, index) => (
                            <div key={index} className="col-6">
                              <code className="d-block p-2 bg-white rounded">
                                {code}
                              </code>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <button
                      className="btn btn-primary mt-3"
                      onClick={() => {
                        setSetupStep("idle");
                        setMfaSetup(null);
                        setSuccess(null);
                        fetchData();
                      }}
                    >
                      Done
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Login History Section */}
            <div className="card mb-4">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h5 className="card-title mb-0">Recent Login Activity</h5>
                  <a
                    href="/security/login-history"
                    className="btn btn-sm btn-outline-primary"
                  >
                    View All
                  </a>
                </div>

                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Status</th>
                        <th>Location</th>
                        <th>Device</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loginHistory.map((item, index) => (
                        <tr key={index}>
                          <td className="small">
                            {formatDate(item.timestamp)}
                          </td>
                          <td>
                            {item.success ? (
                              <span className="badge bg-success">Success</span>
                            ) : (
                              <span
                                className="badge bg-danger"
                                title={item.failureReason}
                              >
                                Failed
                              </span>
                            )}
                          </td>
                          <td className="small">
                            {item.location || item.ipAddress}
                          </td>
                          <td className="small">{item.device}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {loginHistory.length === 0 && (
                  <p
                    className="text-center py-3"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    No login history available
                  </p>
                )}
              </div>
            </div>

            {/* Quick Links */}
            <div className="card">
              <div className="card-body">
                <h5 className="card-title">Additional Security</h5>
                <div className="d-grid gap-2">
                  <a
                    href="/security/sessions"
                    className="btn btn-outline-primary"
                  >
                    <i className="bi bi-laptop me-2"></i>
                    Manage Active Sessions
                  </a>
                  <a href="/profile" className="btn btn-outline-primary">
                    <i className="bi bi-key me-2"></i>
                    Change Password
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-4">
              <Link href="/" className="btn btn-outline-secondary">
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
