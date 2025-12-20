/**
 * Login History Page
 * View detailed login history with filters
 */

"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import MainLayout from "@/components/MainLayout";

interface LoginHistoryItem {
  _id: string;
  timestamp: string;
  success: boolean;
  ipAddress: string;
  device: string;
  browser: string;
  os: string;
  deviceType: string;
  location?: string;
  failureReason?: string;
}

interface LoginStats {
  totalAttempts: number;
  successfulLogins: number;
  failedAttempts: number;
}

export default function LoginHistoryPage() {
  const [history, setHistory] = useState<LoginHistoryItem[]>([]);
  const [stats, setStats] = useState<LoginStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "success" | "failed">("all");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const router = useRouter();

  const ITEMS_PER_PAGE = 20;

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);

      let url = `/api/security/login-history?limit=${ITEMS_PER_PAGE}&page=${page}`;

      if (filter !== "all") {
        url += `&filter=${filter}`;
      }

      const response = await fetch(url, {
        credentials: "include",
      });

      if (response.status === 401) {
        router.push("/login");
        return;
      }

      const data = await response.json();

      if (data.success) {
        setHistory(data.data.history);
        setStats(data.data.stats);
        setHasMore(data.data.history.length === ITEMS_PER_PAGE);
      } else {
        setError(data.error || "Failed to fetch login history");
      }
    } catch {
      setError("An error occurred while fetching login history");
    } finally {
      setLoading(false);
    }
  }, [filter, page, router]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60)
      return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
    if (diffHours < 24)
      return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
    if (diffDays < 7) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;

    return date.toLocaleString();
  }

  function getDeviceIcon(deviceType: string): string {
    switch (deviceType?.toLowerCase()) {
      case "mobile":
        return "📱";
      case "tablet":
        return "📱";
      case "desktop":
      default:
        return "💻";
    }
  }

  function handleFilterChange(newFilter: "all" | "success" | "failed") {
    setFilter(newFilter);
    setPage(1);
  }

  if (loading && !history.length) {
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

  if (error) {
    return (
      <MainLayout>
        <div className="container py-5">
          <div className="alert alert-danger">{error}</div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container py-5">
        <div className="row">
          <div className="col-lg-10 col-xl-10 mx-auto">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 mb-1">Login History</h1>
                <p className="mb-0" style={{ color: "var(--text-secondary)" }}>
                  Track all login attempts to your account
                </p>
              </div>
              <a href="/security/settings" className="btn btn-outline-primary">
                Security Settings
              </a>
            </div>

            {/* Stats Cards */}
            {stats && (
              <div className="row g-3 mb-4">
                <div className="col-md-4">
                  <div className="card">
                    <div className="card-body text-center">
                      <h3 className="mb-0">{stats.totalAttempts}</h3>
                      <p
                        className="mb-0 small"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Total Attempts
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-success">
                    <div className="card-body text-center">
                      <h3
                        className="mb-0"
                        style={{ color: "var(--status-success)" }}
                      >
                        {stats.successfulLogins}
                      </h3>
                      <p
                        className="mb-0 small"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Successful Logins
                      </p>
                    </div>
                  </div>
                </div>
                <div className="col-md-4">
                  <div className="card border-danger">
                    <div className="card-body text-center">
                      <h3
                        className="mb-0"
                        style={{ color: "var(--status-error)" }}
                      >
                        {stats.failedAttempts}
                      </h3>
                      <p
                        className="mb-0 small"
                        style={{ color: "var(--text-secondary)" }}
                      >
                        Failed Attempts
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Filter Buttons */}
            <div className="card mb-3">
              <div className="card-body">
                <div className="btn-group w-100" role="group">
                  <button
                    type="button"
                    className={`btn ${filter === "all" ? "btn-primary" : "btn-outline-primary"}`}
                    onClick={() => handleFilterChange("all")}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    className={`btn ${filter === "success" ? "btn-success" : "btn-outline-success"}`}
                    onClick={() => handleFilterChange("success")}
                  >
                    Successful
                  </button>
                  <button
                    type="button"
                    className={`btn ${filter === "failed" ? "btn-danger" : "btn-outline-danger"}`}
                    onClick={() => handleFilterChange("failed")}
                  >
                    Failed
                  </button>
                </div>
              </div>
            </div>

            {/* History Items */}
            <div className="card">
              <div className="card-body">
                {history.length === 0 ? (
                  <div className="text-center py-5">
                    <i
                      className="bi bi-clock-history"
                      style={{
                        fontSize: "3rem",
                        color: "var(--text-secondary)",
                      }}
                    ></i>
                    <p
                      className="mt-3"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      {filter === "all"
                        ? "No login history available"
                        : filter === "success"
                          ? "No successful logins found"
                          : "No failed login attempts found"}
                    </p>
                  </div>
                ) : (
                  <div className="d-flex flex-column gap-3">
                    {history.map((item, index) => (
                      <div
                        key={`${item._id}-${index}`}
                        className="border rounded p-3"
                        style={{
                          backgroundColor: item.success
                            ? "var(--bg-secondary, #f8f9fa)"
                            : "var(--bg-danger-subtle, #f8d7da)",
                        }}
                      >
                        <div className="d-flex justify-content-between align-items-start mb-2">
                          <div className="flex-grow-1">
                            <div className="d-flex align-items-center gap-2 mb-2 flex-wrap">
                              {item.success ? (
                                <span className="badge bg-success">
                                  <i className="bi bi-check-circle me-1"></i>
                                  Success
                                </span>
                              ) : (
                                <span className="badge bg-danger">
                                  <i className="bi bi-x-circle me-1"></i>
                                  Failed
                                </span>
                              )}
                              <span className="small fw-medium">
                                {formatDate(item.timestamp)}
                              </span>
                            </div>
                            <div
                              className="small mb-1"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {new Date(item.timestamp).toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="row g-2 mt-2">
                          <div className="col-12">
                            <div className="d-flex align-items-start">
                              <span
                                className="me-2"
                                style={{ fontSize: "1.2rem" }}
                              >
                                {getDeviceIcon(item.deviceType)}
                              </span>
                              <div className="flex-grow-1">
                                <div className="small fw-medium">
                                  {item.device}
                                </div>
                                <div
                                  className="small"
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  <i className="bi bi-browser-chrome me-1"></i>
                                  {item.browser} on {item.os}
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="col-12">
                            <div className="small">
                              {item.location && (
                                <div className="mb-1">
                                  <i className="bi bi-geo-alt me-1"></i>
                                  <span className="fw-medium">
                                    {item.location}
                                  </span>
                                </div>
                              )}
                              <div style={{ color: "var(--text-secondary)" }}>
                                <i className="bi bi-router me-1"></i>
                                {item.ipAddress}
                              </div>
                            </div>
                          </div>

                          {!item.success && item.failureReason && (
                            <div className="col-12 mt-2">
                              <span className="badge bg-warning text-dark">
                                <i className="bi bi-exclamation-triangle me-1"></i>
                                {item.failureReason}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pagination */}
            {history.length > 0 && (
              <div className="d-flex justify-content-between align-items-center mt-3">
                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1 || loading}
                >
                  <i className="bi bi-chevron-left me-1"></i>
                  Previous
                </button>

                <span style={{ color: "var(--text-secondary)" }}>
                  Page {page}
                </span>

                <button
                  className="btn btn-outline-secondary"
                  onClick={() => setPage(page + 1)}
                  disabled={!hasMore || loading}
                >
                  Next
                  <i className="bi bi-chevron-right ms-1"></i>
                </button>
              </div>
            )}

            {/* Security Alert */}
            {stats && stats.failedAttempts > 0 && (
              <div className="alert alert-warning mt-4">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Security Notice:</strong> If you see login attempts you
                don&apos;t recognize,
                <Link href="/security/settings" className="alert-link ms-1">
                  change your password
                </Link>{" "}
                and
                <Link href="/security/sessions" className="alert-link ms-1">
                  review active sessions
                </Link>{" "}
                immediately.
              </div>
            )}

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
