"use client";

import { useState, useEffect, lazy, Suspense } from "react";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import {
  formatCurrency,
  formatDate,
  getChangeIndicator,
  getDoughnutChartOptions,
  getChartColors,
} from "@/lib/utils";
import { Table, LoadingSpinner, EmptyState, Badge } from "@/shared/components";
import { useTheme } from "@/contexts/ThemeContext";

// Lazy load Chart.js and react-chartjs-2 to reduce initial bundle size
const DoughnutChart = lazy(async () => {
  // Dynamically import Chart.js and register components
  const ChartJS = await import("chart.js");
  ChartJS.Chart.register(
    ChartJS.CategoryScale,
    ChartJS.LinearScale,
    ChartJS.BarElement,
    ChartJS.Title,
    ChartJS.Tooltip,
    ChartJS.Legend,
    ChartJS.ArcElement
  );

  // Import and return the Doughnut component
  const { Doughnut } = await import("react-chartjs-2");
  return { default: Doughnut };
});

interface OverviewData {
  currentMonthTotal: number;
  currentMonthCount: number;
  lastMonthTotal: number;
  lastMonthCount: number;
  percentageChange: number;
  topCategories: Array<{
    name: string;
    amount: number;
    percentage: number;
  }>;
  dailyAverage: number;
  highestExpenseDay: {
    date: string;
    amount: number;
    description: string;
  };
  categoryDistribution: {
    labels: string[];
    amounts: number[];
  };
}

export default function AnalyticsOverview() {
  const { theme } = useTheme();
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const fetchOverviewData = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/analytics/overview");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch overview data");
      }
    } catch {
      setError("Failed to load overview data");
    } finally {
      setLoading(false);
    }
  };

  const categoryChartData = data
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

  const chartOptions = getDoughnutChartOptions(true, theme);

  const getMonthIcon = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    const monthIcons = [
      "bi-snow", // January
      "bi-heart", // February (Valentine's)
      "bi-flower1", // March (Spring)
      "bi-brightness-high", // April (Spring sunshine)
      "bi-flower2", // May (Spring flowers)
      "bi-sun", // June (Summer)
      "bi-brightness-high-fill", // July (Hot summer)
      "bi-thermometer-sun", // August (Hottest)
      "bi-leaf", // September (Autumn begins)
      "bi-tree", // October (Autumn)
      "bi-cloud-rain", // November (Monsoon end/Winter prep)
      "bi-snow2", // December (Winter)
    ];
    return monthIcons[currentMonth] || "bi-calendar-month";
  };

  if (loading) {
    return (
      <MainLayout>
        <LoadingSpinner
          config={{
            size: "large",
            variant: "primary",
            text: "Loading analytics data...",
            centered: true,
          }}
        />
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
            onClick={fetchOverviewData}
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
          icon="📈"
          title="No Analytics Data"
          description="Add some expenses to see insightful analytics about your spending patterns."
          size="large"
          actions={[
            {
              label: "Go to Expenses",
              onClick: () => (window.location.href = "/expenses"),
              variant: "primary",
              icon: "arrow-right",
            },
          ]}
        />
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="row">
        <div className="col-12">
          {/* Header */}
          <div className="mb-4">
            <div className="d-flex justify-content-between align-items-start flex-wrap">
              <div className="mb-2 mb-md-0">
                <h1 className="h3 mb-1">
                  <i className="bi bi-graph-up me-2"></i>
                  Analytics
                </h1>
              </div>
              <div className="d-flex gap-2 flex-wrap">
                <Link
                  href="/analytics/timeline"
                  className="btn btn-outline-success btn-sm"
                >
                  <i className="bi bi-graph-up me-1"></i>
                  Timeline
                </Link>
                <Link
                  href="/analytics/user/ayush"
                  className="btn btn-outline-info btn-sm"
                >
                  <i className="bi bi-person-circle me-1"></i>
                  Ayush
                </Link>
                <Link
                  href="/analytics/user/saket"
                  className="btn btn-outline-info btn-sm"
                >
                  <i className="bi bi-person-circle me-1"></i>
                  Saket
                </Link>
              </div>
            </div>
          </div>

          {/* Key Metrics Cards */}
          <div className="row mb-4">
            <div className="col-lg-3 col-md-6 mb-3">
              <div className="card bg-primary text-white h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">This Month Total</h6>
                      <h4 className="mb-1">
                        {formatCurrency(data.currentMonthTotal)}
                      </h4>
                      <small className="opacity-75">
                        {data.currentMonthCount} expenses
                      </small>
                    </div>
                    <i className={`${getMonthIcon()} fs-2`}></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-3">
              <div className="card bg-info text-white h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">vs Last Month</h6>
                      <h4 className="mb-1">
                        <i
                          className={`${
                            getChangeIndicator(data.percentageChange).icon
                          } me-2`}
                        ></i>
                        {Math.abs(data.percentageChange).toFixed(1)}%
                      </h4>
                      <small className="opacity-75">
                        {formatCurrency(data.lastMonthTotal)} last month
                      </small>
                    </div>
                    <i className="bi bi-graph-up-arrow fs-2"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-3">
              <div className="card bg-success text-white h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Daily Average</h6>
                      <h4 className="mb-1">
                        {formatCurrency(data.dailyAverage)}
                      </h4>
                      <small className="opacity-75">per day this month</small>
                    </div>
                    <i className="bi bi-speedometer2 fs-2"></i>
                  </div>
                </div>
              </div>
            </div>

            <div className="col-lg-3 col-md-6 mb-3">
              <div className="card bg-warning text-white h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Highest Day</h6>
                      <h4 className="mb-1">
                        {formatCurrency(data.highestExpenseDay.amount)}
                      </h4>
                      <small className="opacity-75">
                        {formatDate(data.highestExpenseDay.date)}
                      </small>
                    </div>
                    <i className="bi bi-trophy fs-2"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Charts and Analysis */}
          <div className="row">
            {/* Top Categories */}
            <div className="col-lg-4 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-bar-chart me-2"></i>
                    Top Spending Categories
                  </h5>
                </div>
                <div
                  className="card-body p-0"
                  style={{
                    maxHeight: "350px",
                    overflowY: "auto",
                    backgroundColor: "var(--card-bg)",
                    borderColor: "var(--card-border)",
                    boxShadow: "var(--card-shadow)",
                  }}
                >
                  <Table
                    config={{
                      columns: [
                        {
                          key: "rank",
                          header: "#",
                          width: "50px",
                          render: (value, row, index) => {
                            const getRankingVariant = (index: number) => {
                              if (index === 0) return "primary";
                              if (index === 1) return "success";
                              if (index === 2) return "info";
                              if (index === 3) return "warning";
                              return "secondary";
                            };
                            return (
                              <Badge variant={getRankingVariant(index)}>
                                {index + 1}
                              </Badge>
                            );
                          },
                        },
                        {
                          key: "name",
                          header: "Category",
                          accessor: "name",
                          render: (value) => (
                            <span className="fw-medium">{value}</span>
                          ),
                        },
                        {
                          key: "amount",
                          header: "Amount",
                          accessor: "amount",
                          align: "right",
                          render: (value) => (
                            <span className="fw-bold">
                              {formatCurrency(value)}
                            </span>
                          ),
                        },
                        {
                          key: "percentage",
                          header: "%",
                          accessor: "percentage",
                          width: "70px",
                          align: "right",
                          render: (value) => (
                            <span style={{ color: "var(--text-secondary)" }}>
                              {value}%
                            </span>
                          ),
                        },
                      ],
                      data: data.topCategories,
                      keyExtractor: (category) => category.name,
                      hover: true,
                      responsive: true,
                      size: "small",
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Category Distribution Pie Chart */}
            <div className="col-lg-8 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-pie-chart me-2"></i>
                    Category Distribution
                  </h5>
                </div>
                <div className="card-body">
                  <div style={{ height: "300px" }}>
                    {categoryChartData && (
                      <Suspense
                        fallback={
                          <div className="text-center py-5">
                            <LoadingSpinner />
                          </div>
                        }
                      >
                        <DoughnutChart
                          data={categoryChartData}
                          options={chartOptions}
                        />
                      </Suspense>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        /* Base container fluid behavior */
        .row {
          max-width: 100%;
          overflow-x: hidden;
        }

        /* iPhone SE and very small screens */
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

          .row {
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }

          .h3,
          h1 {
            font-size: 0.9rem !important;
          }

          .card-body {
            padding: 0.25rem !important;
          }

          .btn-sm,
          .btn {
            font-size: 0.6rem !important;
            padding: 0.15rem 0.25rem !important;
            white-space: nowrap !important;
          }

          .card-title {
            font-size: 0.6rem !important;
            margin-bottom: 0.125rem !important;
          }

          h4,
          h5,
          h6 {
            font-size: 0.75rem !important;
          }

          .row {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .col-lg-3,
          .col-md-6,
          .col-lg-4,
          .col-lg-8,
          .col-12 {
            padding-left: 0.0625rem !important;
            padding-right: 0.0625rem !important;
          }

          .gap-2 {
            gap: 0.125rem !important;
          }

          .mb-4,
          .mb-3 {
            margin-bottom: 0.25rem !important;
          }

          .card {
            margin-bottom: 0.25rem !important;
          }

          .fs-2 {
            font-size: 1rem !important;
          }
        }

        /* Small screens up to 576px */
        @media (max-width: 575px) {
          .row {
            max-width: 100vw !important;
            overflow-x: hidden !important;
            padding-left: 0.25rem !important;
            padding-right: 0.25rem !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .row {
            margin-left: 0 !important;
            margin-right: 0 !important;
          }

          .row > * {
            padding-left: 0.125rem !important;
            padding-right: 0.125rem !important;
          }

          .btn-sm,
          .btn {
            font-size: 0.7rem !important;
            padding: 0.25rem 0.4rem !important;
          }

          .h3,
          h1 {
            font-size: 1rem !important;
          }

          .card-title {
            font-size: 0.8rem !important;
          }

          h4,
          h5,
          h6 {
            font-size: 0.9rem !important;
          }

          .d-flex.gap-2 {
            gap: 0.25rem !important;
          }

          .flex-wrap {
            flex-wrap: wrap !important;
          }
        }

        /* Medium screens */
        @media (max-width: 991px) {
          .row {
            max-width: 100vw !important;
            overflow-x: hidden !important;
          }
        }

        /* Desktop button alignment */
        @media (min-width: 768px) {
          .d-flex.justify-content-between .d-flex.gap-2 {
            margin-left: auto !important;
          }
        }
      `}</style>
    </MainLayout>
  );
}
