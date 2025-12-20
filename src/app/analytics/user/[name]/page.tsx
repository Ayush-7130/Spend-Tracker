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
import { LoadingSpinner, EmptyState } from "@/shared/components";
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
  const [categoryView, setCategoryView] = useState<"overall" | "monthly">(
    "overall"
  );
  const [selectedMonth, setSelectedMonth] = useState<string>("");
  const [monthlyCategoryData, setMonthlyCategoryData] = useState<{
    labels: string[];
    amounts: number[];
  } | null>(null);

  // Get current month in format "MMM 'YY"
  const getCurrentMonth = () => {
    const now = new Date();
    return now.toLocaleDateString("en-IN", {
      month: "short",
      year: "2-digit",
    });
  };

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

  // Fetch monthly category data when month is selected
  const fetchMonthlyCategoryData = useCallback(
    async (month: string) => {
      try {
        console.log(`Fetching monthly data for ${month}...`);
        const response = await fetch(
          `/api/analytics/user/${userName}?month=${month}`
        );
        if (!response.ok) {
          throw new Error("Failed to fetch monthly data");
        }
        const result = await response.json();
        console.log("Monthly data result:", result);
        if (result.success && result.data) {
          console.log(
            "Category distribution:",
            result.data.categoryDistribution
          );
          setMonthlyCategoryData(result.data.categoryDistribution);
        } else {
          // Set empty data if no results
          setMonthlyCategoryData({ labels: [], amounts: [] });
        }
      } catch (err) {
        console.error("Error fetching monthly category data:", err);
        setMonthlyCategoryData({ labels: [], amounts: [] });
      }
    },
    [userName]
  );

  // Set default month to current month when data is loaded
  useEffect(() => {
    if (data && data.monthlyTrends.months.length > 0 && !selectedMonth) {
      const currentMonth = getCurrentMonth();
      // Check if current month exists in the data, otherwise use latest
      const monthToUse = data.monthlyTrends.months.includes(currentMonth)
        ? currentMonth
        : data.monthlyTrends.months[data.monthlyTrends.months.length - 1];
      setSelectedMonth(monthToUse);
    }
  }, [data, selectedMonth]);

  // Fetch monthly data when month changes and view is monthly
  useEffect(() => {
    if (categoryView === "monthly" && selectedMonth) {
      fetchMonthlyCategoryData(selectedMonth);
    }
  }, [categoryView, selectedMonth, fetchMonthlyCategoryData]);

  const categoryPieData = data
    ? {
        labels:
          categoryView === "overall"
            ? data.categoryDistribution.labels
            : monthlyCategoryData?.labels || data.categoryDistribution.labels,
        datasets: [
          {
            data:
              categoryView === "overall"
                ? data.categoryDistribution.amounts
                : monthlyCategoryData?.amounts ||
                  data.categoryDistribution.amounts,
            backgroundColor: getChartColors(
              categoryView === "overall"
                ? data.categoryDistribution.labels.length
                : monthlyCategoryData?.labels.length ||
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
                    <div className="d-flex justify-content-between align-items-center gap-2">
                      <h5 className="mb-0 chart-title">
                        <i className="bi bi-pie-chart me-2"></i>
                        <span className="d-none d-sm-inline">
                          Expense by Category
                        </span>
                        <span className="d-inline d-sm-none">By Category</span>
                      </h5>
                      <div className="d-flex gap-1 gap-sm-2 align-items-center">
                        <select
                          className="form-select form-select-sm chart-select"
                          value={categoryView}
                          onChange={(e) => {
                            const value = e.target.value as
                              | "overall"
                              | "monthly";
                            setCategoryView(value);
                          }}
                        >
                          <option value="overall">Overall</option>
                          <option value="monthly">Monthly</option>
                        </select>
                        {categoryView === "monthly" && data && (
                          <select
                            className="form-select form-select-sm chart-select"
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                          >
                            {data.monthlyTrends.months.map((month) => (
                              <option key={month} value={month}>
                                {month}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="card-body">
                    <div
                      style={{ height: "300px" }}
                      className="d-none d-sm-block"
                    >
                      {categoryPieData && categoryPieData.labels.length > 0 ? (
                        <Pie data={categoryPieData} options={pieChartOptions} />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center h-100">
                          <p
                            className="text-muted mb-0"
                            style={{ fontSize: "0.875rem" }}
                          >
                            No expenses for this period
                          </p>
                        </div>
                      )}
                    </div>
                    <div
                      style={{ height: "200px" }}
                      className="d-block d-sm-none"
                    >
                      {categoryPieData && categoryPieData.labels.length > 0 ? (
                        <Pie data={categoryPieData} options={pieChartOptions} />
                      ) : (
                        <div className="d-flex align-items-center justify-content-center h-100">
                          <p
                            className="text-muted mb-0"
                            style={{ fontSize: "0.75rem" }}
                          >
                            No expenses
                          </p>
                        </div>
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
          </div>
        </div>
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        /* Chart controls styling */
        .chart-title {
          font-size: 1rem;
        }

        .chart-select {
          min-width: 80px;
          font-size: 0.875rem;
          padding: 0.25rem 0.5rem;
        }

        .card-header {
          padding: 0.75rem 1rem;
        }

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

          .card-header {
            padding: 0.375rem 0.5rem !important;
          }

          .chart-title {
            font-size: 0.7rem !important;
          }

          .chart-title i {
            font-size: 0.7rem !important;
          }

          .chart-select {
            min-width: 60px !important;
            font-size: 0.625rem !important;
            padding: 0.125rem 0.25rem !important;
            height: auto !important;
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

          .gap-1 {
            gap: 0.0625rem !important;
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

          .card-header {
            padding: 0.5rem 0.75rem !important;
          }

          .chart-title {
            font-size: 0.85rem !important;
          }

          .chart-select {
            min-width: 70px !important;
            font-size: 0.75rem !important;
            padding: 0.2rem 0.35rem !important;
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
