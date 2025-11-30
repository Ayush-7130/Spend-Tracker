"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
} from "chart.js";
import { Pie, Line } from "react-chartjs-2";
import {
  formatCurrency,
  getPieChartOptions,
  getLineChartOptions,
  getChartColors,
  getUserColor,
  createLineDataset,
} from "@/lib/utils";
import { Table, LoadingSpinner, EmptyState } from "@/shared/components";
import { useTheme } from "@/contexts/ThemeContext";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement
);

interface UserAnalysisData {
  user: string;
  categoryDistribution: {
    labels: string[];
    amounts: number[];
  };
  monthlyTrends: {
    months: string[];
    amounts: number[];
  };
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    count: number;
    percentage: number;
  }>;
  splitExpenses: Array<{
    _id: string;
    description: string;
    amount: number;
    date: string;
    userShare: number;
    userPaid: number;
  }>;
  balance: {
    totalPaid: number;
    totalOwed: number;
    totalOwing: number;
    netBalance: number;
    status: string;
    balances: Record<string, number>;
  };
}

export default function UserAnalyticsPage() {
  const { theme } = useTheme();
  const resolvedParams = useParams();
  const userName = resolvedParams.name as string;

  const [data, setData] = useState<UserAnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUserData = useCallback(async () => {
    try {
      setLoading(true);

      // First, just try to get the analytics data without merging balance data
      const analyticsResponse = await fetch(`/api/analytics/user/${userName}`);

      if (!analyticsResponse.ok) {
        throw new Error(
          `HTTP ${analyticsResponse.status}: ${analyticsResponse.statusText}`
        );
      }

      const analyticsResult = await analyticsResponse.json();

      if (analyticsResult.success && analyticsResult.data) {
        // Use the balance data directly from the API
        setData(analyticsResult.data);
        setError(null);
      } else {
        setError(analyticsResult.error || "No data returned from API");
      }
    } catch (err) {
      if (err instanceof Error) {
        setError(`API Error: ${err.message}`);
      } else {
        setError("Failed to load user data");
      }
    } finally {
      setLoading(false);
    }
  }, [userName]);

  useEffect(() => {
    if (userName) {
      fetchUserData();
    }
  }, [userName, fetchUserData]);

  const categoryPieData = data
    ? {
        labels: data.categoryDistribution.labels,
        datasets: [
          {
            data: data.categoryDistribution.amounts,
            backgroundColor: getChartColors(
              data.categoryDistribution.labels.length,
              theme
            ),
            borderWidth: 2,
            borderColor: theme === "light" ? "#FFFFFF" : "#1E293B",
          },
        ],
      }
    : null;

  const monthlyTrendData = data
    ? {
        labels: data.monthlyTrends.months,
        datasets: [
          createLineDataset(
            `${
              userName.charAt(0).toUpperCase() + userName.slice(1)
            }'s Monthly Spending`,
            data.monthlyTrends.amounts,
            getUserColor(userName, theme)
          ),
        ],
      }
    : null;

  const pieChartOptions = getPieChartOptions(true, theme);
  const lineChartOptions = getLineChartOptions(false, theme);

  if (loading) {
    return (
      <MainLayout>
        <div
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <LoadingSpinner
            config={{
              size: "medium",
              variant: "primary",
              showText: true,
              text: "Loading user analytics...",
            }}
          />
        </div>
      </MainLayout>
    );
  }

  if (error) {
    return (
      <MainLayout>
        <div className="alert alert-danger" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
          <button
            className="btn btn-outline-danger btn-sm ms-3"
            onClick={fetchUserData}
          >
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!data) {
    return (
      <MainLayout>
        <EmptyState
          icon="👤"
          title={`No data for ${userName}`}
          description={`${
            userName.charAt(0).toUpperCase() + userName.slice(1)
          } hasn't recorded any expenses yet.`}
          size="large"
          actions={[
            {
              label: "Go to Expenses",
              onClick: () => (window.location.href = "/expenses"),
              variant: "primary",
            },
          ]}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="container-fluid">
        <div className="row">
          <div className="col-12">
            {/* Header */}
            <div className="mb-3">
              <div className="d-flex justify-content-between align-items-start flex-wrap">
                <div className="mb-2 mb-md-0">
                  <h1 className="h4 mb-0">
                    <i className="bi bi-person-circle me-2"></i>
                    Analytics
                  </h1>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  <Link
                    href="/analytics/overview"
                    className="btn btn-outline-primary btn-sm"
                  >
                    <i className="bi bi-speedometer2 me-1"></i>
                    Overview
                  </Link>
                  <Link
                    href="/analytics/timeline"
                    className="btn btn-outline-success btn-sm"
                  >
                    <i className="bi bi-graph-up me-1"></i>
                    Timeline
                  </Link>
                  <Link
                    href={`/analytics/user/${
                      userName === "saket" ? "ayush" : "saket"
                    }`}
                    className="btn btn-outline-info btn-sm"
                  >
                    <i className="bi bi-person-circle me-1"></i>
                    {userName === "saket" ? "Ayush" : "Saket"}
                  </Link>
                </div>
              </div>
            </div>

            {/* Balance Overview */}
            <div className="row g-2 mb-4">
              <div className="col-6">
                <div className="card bg-primary text-white h-100">
                  <div className="card-body">
                    <h6 className="card-title">Total Paid</h6>
                    <h5 className="mb-1">
                      {formatCurrency(data.balance.totalPaid)}
                    </h5>
                    <small className="opacity-75">by {data.user}</small>
                  </div>
                </div>
              </div>
              <div className="col-6">
                <div
                  className={`card ${
                    data.balance.netBalance >= 0 ? "bg-success" : "bg-danger"
                  } text-white h-100`}
                >
                  <div className="card-body">
                    <h6 className="card-title">Net Balance</h6>
                    <h5 className="mb-1">
                      {data.balance.netBalance >= 0 ? "+" : ""}
                      {formatCurrency(data.balance.netBalance)}
                    </h5>
                    <small className="opacity-75">
                      {data.balance.netBalance >= 0 ? "to receive" : "to pay"}
                    </small>
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div className="row g-2 mb-4">
              {/* Category Distribution Pie Chart */}
              <div className="col-12 col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-pie-chart me-2"></i>
                      Expense by Category
                    </h5>
                  </div>
                  <div className="card-body">
                    <div
                      style={{ height: "300px" }}
                      className="d-none d-sm-block"
                    >
                      {categoryPieData && (
                        <Pie data={categoryPieData} options={pieChartOptions} />
                      )}
                    </div>
                    <div
                      style={{ height: "200px" }}
                      className="d-block d-sm-none"
                    >
                      {categoryPieData && (
                        <Pie data={categoryPieData} options={pieChartOptions} />
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Monthly Spending Trend */}
              <div className="col-12 col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-graph-up me-2"></i>
                      Monthly Spending Trend
                    </h5>
                  </div>
                  <div className="card-body">
                    <div
                      style={{ height: "300px" }}
                      className="d-none d-sm-block"
                    >
                      {monthlyTrendData && (
                        <Line
                          data={monthlyTrendData}
                          options={lineChartOptions}
                        />
                      )}
                    </div>
                    <div
                      style={{ height: "200px" }}
                      className="d-block d-sm-none"
                    >
                      {monthlyTrendData && (
                        <Line
                          data={monthlyTrendData}
                          options={lineChartOptions}
                        />
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tables Row */}
            <div className="row g-2">
              {/* Category Breakdown */}
              <div className="col-12 col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0">
                      <i className="bi bi-list-ul me-2"></i>
                      Category Breakdown
                    </h5>
                  </div>
                  <div
                    className="card-body p-0"
                    style={{
                      height: "calc(100% - 50px)",
                      maxHeight: "280px",
                      overflowY: "auto",
                    }}
                  >
                    <Table
                      config={{
                        columns: [
                          {
                            key: "category",
                            header: "Category",
                            accessor: "category",
                            headerClassName: "sticky-top",
                            render: (value) => (
                              <span style={{ fontSize: "0.75rem" }}>
                                {value}
                              </span>
                            ),
                          },
                          {
                            key: "amount",
                            header: "Amount",
                            accessor: "amount",
                            headerClassName: "sticky-top",
                            render: (value) => (
                              <span style={{ fontSize: "0.75rem" }}>
                                {formatCurrency(value)}
                              </span>
                            ),
                          },
                          {
                            key: "count",
                            header: "Count",
                            accessor: "count",
                            headerClassName: "sticky-top",
                            render: (value) => (
                              <span style={{ fontSize: "0.75rem" }}>
                                {value}
                              </span>
                            ),
                          },
                          {
                            key: "percentage",
                            header: "%",
                            accessor: "percentage",
                            headerClassName: "sticky-top",
                            render: (value) => (
                              <span style={{ fontSize: "0.75rem" }}>
                                {value}%
                              </span>
                            ),
                          },
                        ],
                        data: data.categoryBreakdown,
                        keyExtractor: (category) => category.category,
                        responsive: true,
                        size: "small",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* Balance & Settlement */}
              <div className="col-12 col-lg-6 mb-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h5 className="mb-0 fs-6 fs-sm-5">
                      <i className="bi bi-balance-scale me-2"></i>
                      Balance & Settlement
                    </h5>
                  </div>
                  <div className="card-body p-2 p-sm-3">
                    <div className="row">
                      <div className="col-12 mb-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <i className="bi bi-credit-card me-1"></i>Total
                            Paid:
                          </span>
                          <span
                            className="fw-bold"
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--status-success)",
                            }}
                          >
                            {formatCurrency(data.balance.totalPaid)}
                          </span>
                        </div>
                      </div>
                      <div className="col-12 mb-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <i className="bi bi-arrow-down-circle me-1"></i>
                            Total Owed (to me):
                          </span>
                          <span
                            className="fw-bold text-info"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {formatCurrency(data.balance.totalOwed)}
                          </span>
                        </div>
                      </div>
                      <div className="col-12 mb-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <i className="bi bi-arrow-up-circle me-1"></i>Total
                            Owing (by me):
                          </span>
                          <span
                            className="fw-bold"
                            style={{
                              fontSize: "0.8rem",
                              color: "var(--status-warning)",
                            }}
                          >
                            {formatCurrency(data.balance.totalOwing)}
                          </span>
                        </div>
                      </div>
                      <div className="col-12 mb-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <i className="bi bi-graph-up me-1"></i>Expense
                            Share:
                          </span>
                          <span
                            className="fw-bold text-primary"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {formatCurrency(
                              data.balance.totalPaid + data.balance.totalOwing
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="col-12 mb-1">
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-secondary)",
                            }}
                          >
                            <i className="bi bi-percent me-1"></i>Payment Ratio:
                          </span>
                          <span
                            className="fw-bold"
                            style={{ fontSize: "0.8rem" }}
                          >
                            {(
                              (data.balance.totalPaid /
                                (data.balance.totalPaid +
                                  data.balance.totalOwing || 1)) *
                              100
                            ).toFixed(1)}
                            %
                          </span>
                        </div>
                      </div>
                      {Object.entries(data.balance.balances).map(
                        ([user, amount]) => (
                          <div key={user} className="col-12 mb-1">
                            <div className="d-flex justify-content-between align-items-center">
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-secondary)",
                                }}
                              >
                                <i className="bi bi-person me-1"></i>Balance
                                with {user}:
                              </span>
                              <span
                                className="fw-bold"
                                style={{
                                  fontSize: "0.8rem",
                                  color:
                                    amount > 0
                                      ? "var(--status-success)"
                                      : amount < 0
                                        ? "var(--status-error)"
                                        : "var(--text-secondary)",
                                }}
                              >
                                {amount > 0 ? "+" : ""}
                                {formatCurrency(amount)}
                              </span>
                            </div>
                          </div>
                        )
                      )}
                      <div className="col-12 mt-4">
                        <hr className="my-2" />
                        <div className="d-flex justify-content-between align-items-center">
                          <span
                            className="fw-medium"
                            style={{ fontSize: "0.8rem" }}
                          >
                            <i className="bi bi-balance-scale me-1"></i>Net
                            Balance:
                          </span>
                          <span
                            className="fw-bold"
                            style={{
                              fontSize: "0.9rem",
                              color:
                                data.balance.netBalance > 0
                                  ? "var(--status-success)"
                                  : data.balance.netBalance < 0
                                    ? "var(--status-error)"
                                    : "var(--text-secondary)",
                            }}
                          >
                            {data.balance.netBalance > 0 ? "+" : ""}
                            {formatCurrency(data.balance.netBalance)}
                          </span>
                        </div>
                      </div>
                      <div className="col-12 mt-2">
                        <div
                          className={`alert p-2 mb-0 ${
                            data.balance.netBalance > 0
                              ? "alert-success"
                              : data.balance.netBalance < 0
                                ? "alert-danger"
                                : "alert-secondary"
                          }`}
                          style={{
                            fontSize: "0.7rem",
                          }}
                        >
                          <i
                            className={`bi ${
                              data.balance.netBalance > 0
                                ? "bi-arrow-up-circle"
                                : data.balance.netBalance < 0
                                  ? "bi-arrow-down-circle"
                                  : "bi-check-circle"
                            } me-1`}
                          ></i>
                          {data.balance.netBalance > 0
                            ? `${
                                userName.charAt(0).toUpperCase() +
                                userName.slice(1)
                              } is owed ${formatCurrency(
                                data.balance.netBalance
                              )}`
                            : data.balance.netBalance < 0
                              ? `${
                                  userName.charAt(0).toUpperCase() +
                                  userName.slice(1)
                                } owes ${formatCurrency(
                                  Math.abs(data.balance.netBalance)
                                )}`
                              : "All settled!"}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .table-responsive,
        .position-relative {
          scrollbar-width: thin;
          scrollbar-color: var(--border-secondary) var(--bg-tertiary);
        }

        .table-responsive::-webkit-scrollbar,
        .position-relative::-webkit-scrollbar {
          width: 4px;
        }

        .table-responsive::-webkit-scrollbar-track,
        .position-relative::-webkit-scrollbar-track {
          background: var(--bg-tertiary);
          border-radius: 2px;
        }

        .table-responsive::-webkit-scrollbar-thumb,
        .position-relative::-webkit-scrollbar-thumb {
          background: var(--border-secondary);
          border-radius: 2px;
        }

        .table-responsive::-webkit-scrollbar-thumb:hover,
        .position-relative::-webkit-scrollbar-thumb:hover {
          background: var(--text-tertiary);
        }

        .sticky-top,
        .position-sticky {
          position: sticky !important;
          top: 0 !important;
          z-index: 10 !important;
          background-color: var(--bs-light) !important;
        }

        /* Ensure proper table layout for sticky headers */
        .position-relative .table thead th {
          background-color: var(--bs-light) !important;
          border-bottom: 2px solid var(--bs-border-color) !important;
        }

        /* iPhone SE and very small screens (320px wide) */
        @media (max-width: 375px) {
          * {
            box-sizing: border-box !important;
          }

          .container-fluid {
            padding-left: 0.125rem !important;
            padding-right: 0.125rem !important;
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          .h4,
          h1 {
            font-size: 0.9rem !important;
          }

          .card-body {
            padding: 0.25rem !important;
          }

          .btn {
            font-size: 0.6rem !important;
            padding: 0.15rem 0.25rem !important;
            white-space: nowrap !important;
          }

          .card-title {
            font-size: 0.6rem !important;
            margin-bottom: 0.125rem !important;
          }

          h5 {
            font-size: 0.75rem !important;
          }

          .table {
            font-size: 0.55rem !important;
          }

          .row {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .col-6,
          .col-12 {
            padding-left: 0.0625rem !important;
            padding-right: 0.0625rem !important;
          }

          .card {
            min-height: 65px !important;
          }

          .gap-2 {
            gap: 0.125rem !important;
          }

          .mb-4,
          .mb-3,
          .mb-2 {
            margin-bottom: 0.25rem !important;
          }
        }

        /* Small screens up to 576px */
        @media (max-width: 575px) {
          .container-fluid {
            max-width: 100vw !important;
            overflow-x: hidden !important;
            padding-left: 0.25rem !important;
            padding-right: 0.25rem !important;
          }

          .row {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .row > * {
            padding-left: 0.125rem !important;
            padding-right: 0.125rem !important;
          }

          .btn {
            font-size: 0.7rem !important;
            padding: 0.25rem 0.4rem !important;
          }

          .h4,
          h1 {
            font-size: 1rem !important;
          }

          .card-title {
            font-size: 0.8rem !important;
          }

          h5 {
            font-size: 0.9rem !important;
          }
        }

        /* Medium screens */
        @media (max-width: 991px) {
          .container-fluid {
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }
        }
      `}</style>
    </MainLayout>
  );
}
