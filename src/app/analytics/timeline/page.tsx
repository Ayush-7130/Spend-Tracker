"use client";

import { useState, useEffect, useCallback } from "react";
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
  PointElement,
  LineElement,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import {
  formatCurrency,
  formatTimelineDate,
  getLineChartOptions,
  getBarChartOptions,
  getChartColors,
  createLineDataset,
  getChartTitles,
  getCurrentPeriodText,
  buildPeriodApiUrl,
  PeriodType,
} from "@/lib/utils";
import { LoadingSpinner, Table } from "@/shared/components";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  PointElement,
  LineElement
);

interface TimelineData {
  dailyTrends: {
    dates: string[];
    amounts: number[];
  };
  categoryMonthly: {
    categories: string[];
    periods: string[];
    data: number[][];
  };
  periodTotals: {
    saketTotal: number;
    ayushTotal: number;
    splitTotal: number;
    settlementRequired: number;
    settlementMessage: string;
  };
}

export default function TimelineAnalysis() {
  const [data, setData] = useState<TimelineData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>("month");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const fetchTimelineData = useCallback(async () => {
    try {
      setLoading(true);
      const url = buildPeriodApiUrl(
        "/api/analytics/timeline",
        selectedPeriod,
        customStartDate,
        customEndDate
      );

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setData(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch timeline data");
      }
    } catch (err) {
      console.error("Error fetching timeline data:", err);
      setError("Failed to load timeline data");
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, customStartDate, customEndDate]);

  useEffect(() => {
    fetchTimelineData();
  }, [fetchTimelineData]);

  const { trendTitle, categoryTitle } = getChartTitles(selectedPeriod);
  const periodText = getCurrentPeriodText(
    selectedPeriod,
    customStartDate,
    customEndDate
  );

  const dailyTrendChartData = data
    ? {
        labels: data.dailyTrends.dates.map(formatTimelineDate),
        datasets: [
          createLineDataset(
            "Daily Spending",
            data.dailyTrends.amounts,
            undefined, // use default color
            true, // filled
            selectedPeriod === "week", // highlight today only for week view
            selectedPeriod === "week" ? data.dailyTrends.dates.length - 1 : -1 // today is the last date in week view
          ),
        ],
      }
    : null;

  const categoryStackedData = data
    ? {
        labels: data.categoryMonthly.periods,
        datasets: data.categoryMonthly.categories.map((category, index) => ({
          label: category,
          data: data.categoryMonthly.data[index] || [],
          backgroundColor: getChartColors(
            data.categoryMonthly.categories.length
          )[index],
        })),
      }
    : null;

  const lineChartOptions = getLineChartOptions();
  const stackedBarOptions = getBarChartOptions(true);

  const handlePeriodChange = (period: PeriodType) => {
    setSelectedPeriod(period);
    if (period !== "custom") {
      setCustomStartDate("");
      setCustomEndDate("");
    }
  };

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
              text: "Loading timeline data...",
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
            onClick={fetchTimelineData}
          >
            Retry
          </button>
        </div>
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
                  href="/analytics/overview"
                  className="btn btn-outline-primary btn-sm"
                >
                  <i className="bi bi-speedometer2 me-1"></i>
                  Overview
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

          {/* Period Selector */}
          <div className="card mb-4">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-calendar-range me-2"></i>
                Date Range
              </h6>
              <div className="row align-items-end">
                <div className="col-md-6">
                  <div className="btn-group w-100" role="group">
                    {(
                      [
                        "week",
                        "month",
                        "quarter",
                        "year",
                        "custom",
                      ] as PeriodType[]
                    ).map((period) => (
                      <button
                        key={period}
                        type="button"
                        className={`btn ${
                          selectedPeriod === period
                            ? "btn-primary"
                            : "btn-outline-primary"
                        }`}
                        onClick={() => handlePeriodChange(period)}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                {selectedPeriod === "custom" && (
                  <div className="col-md-6">
                    <div className="row">
                      <div className="col-6">
                        <label htmlFor="startDate" className="form-label">
                          Start Date
                        </label>
                        <input
                          type="date"
                          id="startDate"
                          className="form-control"
                          value={customStartDate}
                          onChange={(e) => setCustomStartDate(e.target.value)}
                        />
                      </div>
                      <div className="col-6">
                        <label htmlFor="endDate" className="form-label">
                          End Date
                        </label>
                        <input
                          type="date"
                          id="endDate"
                          className="form-control"
                          value={customEndDate}
                          onChange={(e) => setCustomEndDate(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Charts */}
          <div className="row mb-4">
            {/* Daily/Period Spending Trend */}
            <div className="col-lg-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-graph-up me-2"></i>
                    {trendTitle}
                  </h5>
                  {periodText && (
                    <small className="text-muted">{periodText}</small>
                  )}
                </div>
                <div className="card-body">
                  <div style={{ height: "300px" }}>
                    {dailyTrendChartData && (
                      <Line
                        data={dailyTrendChartData}
                        options={lineChartOptions}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Category-wise Period Spending */}
            <div className="col-lg-6 mb-4">
              <div className="card h-100">
                <div className="card-header">
                  <h5 className="mb-0">
                    <i className="bi bi-bar-chart me-2"></i>
                    {categoryTitle}
                  </h5>
                  {periodText && (
                    <small className="text-muted">{periodText}</small>
                  )}
                </div>
                <div className="card-body">
                  <div style={{ height: "300px" }}>
                    {categoryStackedData && (
                      <Bar
                        data={categoryStackedData}
                        options={stackedBarOptions}
                      />
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Period Totals Table */}
          {data && (
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-table me-2"></i>
                  Period Summary
                </h5>
              </div>
              <div className="card-body">
                <div className="row">
                  <Table
                    config={{
                      columns: [
                        {
                          key: "user",
                          header: "User",
                          accessor: "user",
                          render: (value, row) => (
                            <div>
                              <i
                                className={`bi bi-person-circle me-2 ${
                                  row.user === "Saket"
                                    ? "text-primary"
                                    : row.user === "Ayush"
                                    ? "text-success"
                                    : ""
                                }`}
                              ></i>
                              <strong>{value}</strong>
                            </div>
                          ),
                        },
                        {
                          key: "personalExpenses",
                          header: "Personal Expenses",
                          accessor: "personalExpenses",
                          render: (value, row) =>
                            row.user === "Total" ? (
                              <strong>{formatCurrency(value)}</strong>
                            ) : (
                              formatCurrency(value)
                            ),
                        },
                        {
                          key: "splitExpenses",
                          header: "Split Expenses",
                          accessor: "splitExpenses",
                          render: (value, row) =>
                            row.user === "Total" ? (
                              <strong>{formatCurrency(value)}</strong>
                            ) : (
                              formatCurrency(value)
                            ),
                        },
                        {
                          key: "totalPaid",
                          header: "Total Paid",
                          accessor: "totalPaid",
                          render: (value, row) => (
                            <span className="fw-bold">
                              {formatCurrency(value)}
                            </span>
                          ),
                        },
                      ],
                      data: [
                        {
                          user: "Saket",
                          personalExpenses: data.periodTotals.saketTotal,
                          splitExpenses: data.periodTotals.splitTotal / 2,
                          totalPaid:
                            data.periodTotals.saketTotal +
                            data.periodTotals.splitTotal / 2,
                        },
                        {
                          user: "Ayush",
                          personalExpenses: data.periodTotals.ayushTotal,
                          splitExpenses: data.periodTotals.splitTotal / 2,
                          totalPaid:
                            data.periodTotals.ayushTotal +
                            data.periodTotals.splitTotal / 2,
                        },
                        {
                          user: "Total",
                          personalExpenses:
                            data.periodTotals.saketTotal +
                            data.periodTotals.ayushTotal,
                          splitExpenses: data.periodTotals.splitTotal,
                          totalPaid:
                            data.periodTotals.saketTotal +
                            data.periodTotals.ayushTotal +
                            data.periodTotals.splitTotal,
                        },
                      ],
                      keyExtractor: (row) => row.user,
                      bordered: true,
                      responsive: true,
                      rowClassName: (row) =>
                        row.user === "Total" ? "table-info" : "",
                    }}
                  />
                </div>
              </div>
            </div>
          )}
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

          .col-lg-6,
          .col-lg-8,
          .col-lg-4,
          .col-md-6,
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

          .table {
            font-size: 0.55rem !important;
          }

          .btn-group .btn {
            font-size: 0.5rem !important;
            padding: 0.1rem 0.2rem !important;
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

          .btn-group .btn {
            font-size: 0.65rem !important;
            padding: 0.2rem 0.3rem !important;
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
