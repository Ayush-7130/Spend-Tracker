'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
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
} from 'chart.js';
import { Pie, Line } from 'react-chartjs-2';
import {
  formatCurrency,
  getPieChartOptions,
  getLineChartOptions,
  getChartColors,
  getUserColor,
  createLineDataset
} from '@/lib/utils';

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
        throw new Error(`HTTP ${analyticsResponse.status}: ${analyticsResponse.statusText}`);
      }
      
      const analyticsResult = await analyticsResponse.json();
      
      console.log('Analytics result:', analyticsResult);
      
      if (analyticsResult.success && analyticsResult.data) {
        // Use the balance data directly from the API
        setData(analyticsResult.data);
        setError(null);
      } else {
        setError(analyticsResult.error || 'No data returned from API');
      }
    } catch (err) {
      console.error('Error fetching user data:', err);
      if (err instanceof Error) {
        setError(`API Error: ${err.message}`);
      } else {
        setError('Failed to load user data');
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

  const categoryPieData = data ? {
    labels: data.categoryDistribution.labels,
    datasets: [
      {
        data: data.categoryDistribution.amounts,
        backgroundColor: getChartColors(data.categoryDistribution.labels.length),
        borderWidth: 2,
        borderColor: '#ffffff',
      },
    ],
  } : null;

  const monthlyTrendData = data ? {
    labels: data.monthlyTrends.months,
    datasets: [createLineDataset(
      `${userName.charAt(0).toUpperCase() + userName.slice(1)}'s Monthly Spending`,
      data.monthlyTrends.amounts,
      getUserColor(userName)
    )],
  } : null;

  const pieChartOptions = getPieChartOptions();
  const lineChartOptions = getLineChartOptions();

  if (loading) {
    return (
      <MainLayout>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
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
        <div className="alert alert-info" role="alert">
          <i className="bi bi-info-circle me-2"></i>
          No data available for {userName}.
        </div>
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
                  Analytics - {data.user.charAt(0).toUpperCase() + data.user.slice(1)}
                </h1>
              </div>
              <div className="d-flex flex-wrap gap-2">
                <Link href="/analytics/overview" className="btn btn-outline-primary">
                  <i className="bi bi-speedometer2 me-2"></i>
                  Overview
                </Link>
                <Link href="/analytics/timeline" className="btn btn-outline-success">
                  <i className="bi bi-graph-up me-2"></i>
                  Timeline
                </Link>
                <Link 
                  href={`/analytics/user/${userName === 'saket' ? 'ayush' : 'saket'}`}
                  className="btn btn-outline-info"
                >
                  <i className="bi bi-person-circle me-2"></i>
                  {userName === 'saket' ? 'Ayush' : 'Saket'}
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
                  <h5 className="mb-1">{formatCurrency(data.balance.totalPaid)}</h5>
                  <small className="opacity-75">by {data.user}</small>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card bg-info text-white h-100">
                <div className="card-body">
                  <h6 className="card-title">Total Owed</h6>
                  <h5 className="mb-1">{formatCurrency(data.balance.totalOwed)}</h5>
                  <small className="opacity-75">by others</small>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className="card bg-warning text-dark h-100">
                <div className="card-body">
                  <h6 className="card-title">Total Owing</h6>
                  <h5 className="mb-1">{formatCurrency(data.balance.totalOwing)}</h5>
                  <small className="opacity-75">to others</small>
                </div>
              </div>
            </div>
            <div className="col-6">
              <div className={`card ${data.balance.netBalance >= 0 ? 'bg-success' : 'bg-danger'} text-white h-100`}>
                <div className="card-body">
                  <h6 className="card-title">Net Balance</h6>
                  <h5 className="mb-1">
                    {data.balance.netBalance >= 0 ? '+' : ''}{formatCurrency(data.balance.netBalance)}
                  </h5>
                  <small className="opacity-75">
                    {data.balance.netBalance >= 0 ? 'to receive' : 'to pay'}
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
                  <div style={{ height: '300px' }} className="d-none d-sm-block">
                    {categoryPieData && (
                      <Pie data={categoryPieData} options={pieChartOptions} />
                    )}
                  </div>
                  <div style={{ height: '200px' }} className="d-block d-sm-none">
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
                  <div style={{ height: '300px' }} className="d-none d-sm-block">
                    {monthlyTrendData && (
                      <Line data={monthlyTrendData} options={lineChartOptions} />
                    )}
                  </div>
                  <div style={{ height: '200px' }} className="d-block d-sm-none">
                    {monthlyTrendData && (
                      <Line data={monthlyTrendData} options={lineChartOptions} />
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
                <div className="card-body p-0" style={{ height: 'calc(100% - 50px)', display: 'flex', flexDirection: 'column' }}>
                  <div className="table-responsive" style={{ flex: 1, overflowY: 'auto', maxHeight: '300px' }}>
                    <table className="table table-sm mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th style={{ fontSize: '0.8rem' }}>Category</th>
                          <th style={{ fontSize: '0.8rem' }}>Amount</th>
                          <th style={{ fontSize: '0.8rem' }}>Count</th>
                          <th style={{ fontSize: '0.8rem' }}>%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.categoryBreakdown.map((category) => (
                          <tr key={category.category}>
                            <td style={{ fontSize: '0.75rem' }}>{category.category}</td>
                            <td style={{ fontSize: '0.75rem' }}>{formatCurrency(category.amount)}</td>
                            <td style={{ fontSize: '0.75rem' }}>{category.count}</td>
                            <td style={{ fontSize: '0.75rem' }}>{category.percentage}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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
                <div className="card-body d-flex flex-column p-2 p-sm-3" style={{ height: 'calc(100% - 50px)' }}>
                  <div className="row flex-grow-1">
                    <div className="col-12 mb-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Total Paid:</span>
                        <span className="fw-bold" style={{ fontSize: '0.8rem' }}>{formatCurrency(data.balance.totalPaid)}</span>
                      </div>
                    </div>
                    <div className="col-12 mb-2">
                      <div className="d-flex justify-content-between">
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Total Owed:</span>
                        <span className="fw-bold" style={{ fontSize: '0.8rem' }}>{formatCurrency(data.balance.totalOwed)}</span>
                      </div>
                    </div>
                    <div className="col-12 mb-2">
                      <hr />
                      <div className="d-flex justify-content-between">
                        <span className="text-muted" style={{ fontSize: '0.8rem' }}>Net Balance:</span>
                        <span className={`fw-bold ${data.balance.netBalance > 0 ? 'text-success' : data.balance.netBalance < 0 ? 'text-danger' : 'text-muted'}`} style={{ fontSize: '0.8rem' }}>
                          {formatCurrency(Math.abs(data.balance.netBalance))}
                        </span>
                      </div>
                    </div>
                    <div className="col-12 mt-auto">
                      <div className="alert alert-sm p-2 mb-0" style={{
                        backgroundColor: data.balance.netBalance > 0 ? '#d1e7dd' : data.balance.netBalance < 0 ? '#f8d7da' : '#f8f9fa',
                        borderColor: data.balance.netBalance > 0 ? '#badbcc' : data.balance.netBalance < 0 ? '#f5c2c7' : '#dee2e6',
                        color: data.balance.netBalance > 0 ? '#0f5132' : data.balance.netBalance < 0 ? '#842029' : '#495057'
                      }}>
                        <i className={`bi ${data.balance.netBalance > 0 ? 'bi-arrow-up-circle' : data.balance.netBalance < 0 ? 'bi-arrow-down-circle' : 'bi-check-circle'} me-1`}></i>
                        <small style={{ fontSize: '0.7rem' }}>
                          {data.balance.netBalance > 0 
                            ? `${userName.charAt(0).toUpperCase() + userName.slice(1)} is owed ${formatCurrency(data.balance.netBalance)}`
                            : data.balance.netBalance < 0 
                              ? `${userName.charAt(0).toUpperCase() + userName.slice(1)} owes ${formatCurrency(Math.abs(data.balance.netBalance))}`
                              : 'All settled!'
                          }
                        </small>
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
        .table-responsive {
          scrollbar-width: thin;
          scrollbar-color: #cbd5e0 #f7fafc;
        }
        
        .table-responsive::-webkit-scrollbar {
          width: 4px;
        }
        
        .table-responsive::-webkit-scrollbar-track {
          background: #f7fafc;
          border-radius: 2px;
        }
        
        .table-responsive::-webkit-scrollbar-thumb {
          background: #cbd5e0;
          border-radius: 2px;
        }
        
        .table-responsive::-webkit-scrollbar-thumb:hover {
          background: #a0aec0;
        }

        .sticky-top {
          position: sticky;
          top: 0;
          z-index: 10;
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
          
          .h4, h1 {
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
          
          .col-6, .col-12 {
            padding-left: 0.0625rem !important;
            padding-right: 0.0625rem !important;
          }
          
          .card {
            min-height: 65px !important;
          }
          
          .gap-2 {
            gap: 0.125rem !important;
          }
          
          .mb-4, .mb-3, .mb-2 {
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
          
          .h4, h1 {
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
