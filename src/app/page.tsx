'use client';

import { useState, useEffect } from 'react';
import MainLayout from '@/components/MainLayout';
import Link from 'next/link';
import { useOperationNotification } from '@/contexts/NotificationContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useConfirmation } from '@/hooks/useConfirmation';

interface DashboardData {
  totalExpenses: number;
  totalExpenseCount: number;
  thisMonthTotal: number;
  thisMonthCount: number;
  categoriesCount: number;
  settlementAmount: number;
  settlementMessage: string;
  users: Array<{
    id: string;
    name: string;
  }>;
  recentExpenses: {
    _id: string;
    amount: number;
    description: string;
    date: string;
    category: string;
    paidBy: string;
    isSplit?: boolean;
    categoryName?: string;
  }[];
}

interface Settlement {
  _id: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description?: string;
  date: string;
}

interface Subcategory {
  name: string;
  description: string;
}

interface Category {
  _id: string;
  name: string;
  description: string;
  subcategories?: Subcategory[];
}

interface SettlementData {
  balances: Array<{
    fromUser: string;
    toUser: string;
    amount: number;
    status: 'owes' | 'settled';
  }>;
  summary: {
    totalOwed: number;
    totalSettled: number;
    totalTransactions: number;
    activeBalances: number;
  };
}

export default function Home() {
  const { notifyAdded } = useOperationNotification();
  const confirmation = useConfirmation();
  
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [settlementData, setSettlementData] = useState<SettlementData | null>(null);
  const [recentSettlements, setRecentSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<'all' | 'saket' | 'ayush'>('all');
  
  // Dialog states
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  
  // Form states
  const [newExpense, setNewExpense] = useState({
    name: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    category: '',
    subcategory: '',
    paidBy: '',
    splitBetween: [] as string[],
    isSplit: false,
    saketAmount: '',
    ayushAmount: ''
  });
  
  const [newSettlement, setNewSettlement] = useState({
    from: '',
    to: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });

  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetchDashboardData(selectedUser);
    fetchCategories();
    if (selectedUser === 'all') {
      fetchSettlementData();
    }
  }, [selectedUser]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json();
        setCategories(result.success ? result.data : []);
      }
    } catch (error) {
      console.error('Failed to fetch categories:', error);
      setCategories([]);
    }
  };

  const fetchSettlementData = async () => {
    try {
      const [balanceResponse, settlementsResponse] = await Promise.all([
        fetch('/api/settlements/balance'),
        fetch('/api/settlements')
      ]);
      
      if (balanceResponse.ok) {
        const balanceResult = await balanceResponse.json();
        setSettlementData(balanceResult);
      }
      
      if (settlementsResponse.ok) {
        const settlementsResult = await settlementsResponse.json();
        setRecentSettlements(settlementsResult.slice(0, 5)); // Get recent 5 settlements
      }
    } catch (err) {
      console.error('Error fetching settlement data:', err);
    }
  };

  useEffect(() => {
    fetchDashboardData(selectedUser);
    if (selectedUser === 'all') {
      fetchSettlementData();
    }
  }, [selectedUser]);

  const fetchDashboardData = async (user: 'all' | 'saket' | 'ayush' = 'all') => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard?user=${user}`);
      const result = await response.json();
      
      if (result.success) {
        setDashboardData(result.data);
        setError(null);
      } else {
        setError(result.error || 'Failed to fetch dashboard data');
      }
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const getUserDisplayName = () => {
    if (selectedUser === 'all') return 'All Users';
    return selectedUser.charAt(0).toUpperCase() + selectedUser.slice(1);
  };

  const getStatsTitle = (baseTitle: string) => {
    if (baseTitle.includes('This Month')) {
      const currentMonth = new Date().toLocaleDateString('en-IN', { month: 'short' });
      const monthTitle = baseTitle.replace('This Month', `${currentMonth} ${new Date().getFullYear()}`);
      if (selectedUser === 'all') {
        return monthTitle.replace('My ', 'Total ');
      }
      return monthTitle;
    }
    
    if (selectedUser === 'all') {
      return baseTitle.replace('My ', 'Total ');
    }
    return baseTitle;
  };

  const getMonthIcon = () => {
    const currentMonth = new Date().getMonth(); // 0-11
    const monthIcons = [
      'bi-snow', // January
      'bi-heart', // February (Valentine's)
      'bi-flower1', // March (Spring)
      'bi-brightness-high', // April (Spring sunshine)
      'bi-flower2', // May (Spring flowers)
      'bi-sun', // June (Summer)
      'bi-brightness-high-fill', // July (Hot summer)
      'bi-thermometer-sun', // August (Hottest)
      'bi-leaf', // September (Autumn begins)
      'bi-tree', // October (Autumn)
      'bi-cloud-rain', // November (Monsoon end/Winter prep)
      'bi-snow2' // December (Winter)
    ];
    return monthIcons[currentMonth] || 'bi-calendar-month';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationLoading(true);
    
    try {
      const totalAmount = parseFloat(newExpense.amount);
      
      // Calculate split details if expense is split
      let splitDetails: { saketAmount?: number, ayushAmount?: number } | null = null;
      const isSplit = newExpense.isSplit;
      
      if (isSplit) {
        const saketAmount = parseFloat(newExpense.saketAmount || '0');
        const ayushAmount = parseFloat(newExpense.ayushAmount || '0');
        const splitTotal = saketAmount + ayushAmount;
        
        // Validate split amounts
        if (Math.abs(splitTotal - totalAmount) > 0.01) {
          setError(`Split amounts (₹${splitTotal.toFixed(2)}) must equal total amount (₹${totalAmount.toFixed(2)})`);
          return;
        }
        
        splitDetails = {
          saketAmount,
          ayushAmount
        };
      }

      const expenseData = {
        description: newExpense.name, // API expects 'description', not 'name'
        amount: totalAmount,
        date: newExpense.date,
        category: newExpense.category,
        subcategory: newExpense.subcategory || '',
        paidBy: newExpense.paidBy,
        isSplit,
        splitDetails
      };

      const response = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });
      
      if (response.ok) {
        setShowAddExpenseDialog(false);
        setNewExpense({
          name: '',
          amount: '',
          description: '',
          date: new Date().toISOString().split('T')[0],
          category: '',
          subcategory: '',
          paidBy: '',
          splitBetween: [],
          isSplit: false,
          saketAmount: '',
          ayushAmount: ''
        });
        fetchDashboardData(selectedUser);
        if (selectedUser === 'all') {
          fetchSettlementData();
        }
        notifyAdded('Expense');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to add expense');
      }
    } catch {
      setError('Failed to add expense');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationLoading(true);
    
    // Validation: Check if from and to users are the same
    if (newSettlement.from === newSettlement.to) {
      setError('From and To users cannot be the same person');
      setOperationLoading(false);
      return;
    }
    
    // Validation: Check if amount is valid
    const amount = parseFloat(newSettlement.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      setOperationLoading(false);
      return;
    }
    
    try {
      // Convert IDs to proper names
      const getUserName = (id: string) => {
        const user = dashboardData?.users?.find(u => u.id === id);
        return user?.name || id;
      };

      const settlementData = {
        fromUser: getUserName(newSettlement.from),
        toUser: getUserName(newSettlement.to),
        amount: amount,
        date: newSettlement.date,
        description: newSettlement.description,
        expenseId: '000000000000000000000000' // Placeholder for now
      };

      const response = await fetch('/api/settlements', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settlementData),
      });

      if (response.ok) {
        setShowSettlementDialog(false);
        setNewSettlement({
          from: '',
          to: '',
          amount: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        });
        // Refresh dashboard and settlement data
        await fetchDashboardData(selectedUser);
        await fetchSettlementData();
        setError(null); // Clear any previous errors
        notifyAdded('Settlement');
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to record settlement');
      }
    } catch {
      setError('Error recording settlement');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleQuickSettle = () => {
    if (!settlementData || settlementData.balances.length === 0) return;
    
    // Get the first outstanding balance
    const outstandingBalance = settlementData.balances.find(b => b.status === 'owes');
    if (!outstandingBalance) return;
    
    // Convert names to IDs for the form
    const getIdFromName = (name: string) => {
      return name.toLowerCase();
    };
    
    // Pre-fill the settlement form with the outstanding balance
    setNewSettlement({
      from: getIdFromName(outstandingBalance.fromUser),
      to: getIdFromName(outstandingBalance.toUser),
      amount: outstandingBalance.amount.toString(),
      date: new Date().toISOString().split('T')[0],
      description: `Settlement for outstanding balance`
    });
    
    // Open the settlement dialog
    setShowSettlementDialog(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container-fluid mt-4">
          <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
            <div className="text-center">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <p className="mt-3 text-muted">Loading dashboard data...</p>
            </div>
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
            onClick={() => fetchDashboardData(selectedUser)}
          >
            Retry
          </button>
        </div>
      </MainLayout>
    );
  }

  if (!dashboardData) {
    return (
      <MainLayout>
        <div className="alert alert-info" role="alert">
          <i className="bi bi-info-circle me-2"></i>
          No data available. Please add some expenses to get started.
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="bi bi-house-door me-2"></i>
              Dashboard - {getUserDisplayName()}
            </h1>
            <div className="d-flex gap-2">
              {/* User Selector Dropdown */}
              <div className="dropdown">
                <button 
                  className="btn btn-primary dropdown-toggle" 
                  type="button" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                >
                  <i className="bi bi-person me-1"></i>
                  {getUserDisplayName()}
                </button>
                <ul className="dropdown-menu" style={{ zIndex: 1050 }}>
                  <li>
                    <button 
                      className={`dropdown-item ${selectedUser === 'all' ? 'active' : ''}`}
                      onClick={() => setSelectedUser('all')}
                    >
                      <i className="bi bi-people me-2"></i>
                      All Users
                    </button>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button 
                      className={`dropdown-item ${selectedUser === 'saket' ? 'active' : ''}`}
                      onClick={() => setSelectedUser('saket')}
                    >
                      <i className="bi bi-person me-2"></i>
                      Saket
                    </button>
                  </li>
                  <li>
                    <button 
                      className={`dropdown-item ${selectedUser === 'ayush' ? 'active' : ''}`}
                      onClick={() => setSelectedUser('ayush')}
                    >
                      <i className="bi bi-person me-2"></i>
                      Ayush
                    </button>
                  </li>
                </ul>
              </div>
              <button 
                className="btn btn-outline-secondary btn-sm"
                onClick={() => fetchDashboardData(selectedUser)}
                disabled={loading}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </button>
            </div>
          </div>
          
          {/* Quick Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <div className="card bg-primary text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">{getStatsTitle('My Total Expenses')}</h6>
                      <h4 className="mb-0">{formatCurrency(dashboardData.totalExpenses)}</h4>
                      <small className="opacity-75">{dashboardData.totalExpenseCount} transactions</small>
                    </div>
                    <i className="bi bi-currency-rupee fs-2"></i>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-4 mb-3">
              <div className="card bg-success text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">{getStatsTitle('My This Month')}</h6>
                      <h4 className="mb-0">{formatCurrency(dashboardData.thisMonthTotal)}</h4>
                      <small className="opacity-75">{dashboardData.thisMonthCount} expenses</small>
                    </div>
                    <i className={`${getMonthIcon()} fs-2`}></i>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="col-md-4 mb-3">
              <div className="card bg-warning text-white">
                <div className="card-body">
                  <div className="d-flex justify-content-between">
                    <div>
                      <h6 className="card-title">Categories</h6>
                      <h4 className="mb-0">{dashboardData.categoriesCount}</h4>
                      <small className="opacity-75">configured</small>
                    </div>
                    <i className="bi bi-tags fs-2"></i>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="row mb-4">
            <div className="col-md-8">
              <div className="card">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    {selectedUser === 'all' ? 'Recent Expenses' : 'My Recent Expenses'}
                  </h5>
                  <Link href="/expenses" className="btn btn-sm btn-outline-primary">
                    View All
                  </Link>
                </div>
                <div className="card-body">
                  {dashboardData.recentExpenses.length === 0 ? (
                    <div className="text-center py-4">
                      <i className="bi bi-inbox fs-1 text-muted"></i>
                      <p className="text-muted mt-2 mb-3">No expenses found</p>
                      <button 
                        className="btn btn-primary"
                        onClick={() => setShowAddExpenseDialog(true)}
                      >
                        Add your first expense
                      </button>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm">
                        <thead>
                          <tr>
                            <th>Date</th>
                            <th>Description</th>
                            <th>Category</th>
                            <th>Amount</th>
                            {selectedUser === 'all' ? (
                              <th>Paid By</th>
                            ) : (
                              <th>Type</th>
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          {dashboardData.recentExpenses.map((expense) => (
                            <tr key={expense._id}>
                              <td>{formatDate(expense.date)}</td>
                              <td>{expense.description}</td>
                              <td>
                                <span className="badge bg-secondary">
                                  {expense.categoryName || expense.category}
                                </span>
                              </td>
                              <td>{formatCurrency(expense.amount)}</td>
                              {selectedUser === 'all' ? (
                                <td>
                                  <span className={`badge ${expense.paidBy === 'saket' ? 'bg-primary' : 'bg-success'}`}>
                                    {expense.paidBy === 'saket' ? 'Saket' : 'Ayush'}
                                  </span>
                                </td>
                              ) : (
                                <td>
                                  <span className={`badge ${expense.isSplit ? 'bg-warning' : 'bg-info'}`}>
                                    {expense.isSplit ? 'Split' : 'Personal'}
                                  </span>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
            
            <div className="col-md-4">
              <div className="card">
                <div className="card-header">
                  <h5 className="mb-0">Quick Actions</h5>
                </div>
                <div className="card-body">
                  <div className="d-grid gap-2">
                    <button 
                      className="btn btn-primary"
                      onClick={() => setShowAddExpenseDialog(true)}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Add Expense
                    </button>
                    {selectedUser === 'all' && (
                      <>
                        <button 
                          className="btn btn-success"
                          onClick={() => setShowSettlementDialog(true)}
                        >
                          <i className="bi bi-currency-exchange me-2"></i>
                          Record Settlement
                        </button>
                        {settlementData && settlementData.balances.length > 0 && (
                          <button 
                            className="btn btn-warning"
                            onClick={() => handleQuickSettle()}
                          >
                            <i className="bi bi-lightning-fill me-2"></i>
                            Quick Settle All
                          </button>
                        )}
                      </>
                    )}
                    <Link href="/categories" className="btn btn-outline-secondary">
                      <i className="bi bi-tags me-2"></i>
                      Manage Categories
                    </Link>
                    <Link href="/analytics" className="btn btn-outline-info">
                      <i className="bi bi-graph-up me-2"></i>
                      View Analytics
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Settlement Status - Only show when All Users is selected */}
          {selectedUser === 'all' && settlementData && (
            <div className="row mb-4">
              <div className="col-md-8">
                <div className="card">
                  <div className="card-header d-flex justify-content-between align-items-center py-2">
                    <h6 className="mb-0">
                      <i className="bi bi-currency-exchange me-2"></i>
                      Settlement Status
                    </h6>
                    <Link href="/settlements" className="btn btn-sm btn-outline-primary">
                      View All
                    </Link>
                  </div>
                  <div className="card-body py-2">
                    {settlementData.balances.length > 0 ? (
                      <div className="table-responsive">
                        <table className="table table-sm mb-0">
                          <thead>
                            <tr>
                              <th className="py-1">From</th>
                              <th className="py-1">To</th>
                              <th className="py-1">Amount</th>
                              <th className="py-1">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {settlementData.balances
                              .filter(balance => balance.status === 'owes')
                              .slice(0, 3)
                              .map((balance, index) => (
                              <tr key={index}>
                                <td className="py-1">
                                  <div className="d-flex align-items-center">
                                    <div className="avatar-xs bg-warning text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                      {balance.fromUser.charAt(0)}
                                    </div>
                                    <small>{balance.fromUser}</small>
                                  </div>
                                </td>
                                <td className="py-1">
                                  <div className="d-flex align-items-center">
                                    <div className="avatar-xs bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                      {balance.toUser.charAt(0)}
                                    </div>
                                    <small>{balance.toUser}</small>
                                  </div>
                                </td>
                                <td className="py-1">
                                  <small className="text-danger fw-bold">₹{balance.amount}</small>
                                </td>
                                <td className="py-1">
                                  <span className="badge bg-danger" style={{fontSize: '10px'}}>Outstanding</span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center py-3">
                        <i className="bi bi-check-circle-fill fs-4 text-success"></i>
                        <p className="text-success mt-1 mb-2 small">All Settled Up!</p>
                        <p className="text-muted small mb-0">No outstanding balances</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              <div className="col-md-4">
                <div className="card">
                  <div className="card-header py-2">
                    <h6 className="mb-0">Settlement Summary</h6>
                  </div>
                  <div className="card-body py-2">
                    <div className="d-flex justify-content-between mb-2">
                      <small>Outstanding:</small>
                      <small className="text-danger fw-bold">₹{settlementData.summary.totalOwed}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <small>Settled:</small>
                      <small className="text-success fw-bold">₹{settlementData.summary.totalSettled}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <small>Transactions:</small>
                      <small className="fw-bold">{settlementData.summary.totalTransactions}</small>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <small>Active:</small>
                      <small className="text-warning fw-bold">{settlementData.summary.activeBalances}</small>
                    </div>
                    <div className="d-grid">
                      <Link href="/settlements" className="btn btn-primary btn-sm">
                        <i className="bi bi-currency-exchange me-1"></i>
                        Manage Settlements
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Recent Settlements - Only show when All Users is selected */}
          {selectedUser === 'all' && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card">
                  <div className="card-header d-flex justify-content-between align-items-center py-2">
                    <h6 className="mb-0">
                      <i className="bi bi-clock-history me-2"></i>
                      Recent Settlements
                    </h6>
                    <Link href="/settlements" className="btn btn-sm btn-outline-primary">
                      View All Settlements
                    </Link>
                  </div>
                  <div className="card-body py-2">
                    {recentSettlements.length === 0 ? (
                      <div className="text-center py-4">
                        <i className="bi bi-inbox fs-1 text-muted"></i>
                        <p className="text-muted mt-2 mb-3">No settlements recorded</p>
                        <button 
                          className="btn btn-primary"
                          onClick={() => setShowSettlementDialog(true)}
                        >
                          Record your first settlement
                        </button>
                      </div>
                    ) : (
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead>
                          <tr>
                            <th className="py-1">Date</th>
                            <th className="py-1">From</th>
                            <th className="py-1">To</th>
                            <th className="py-1">Amount</th>
                            <th className="py-1">Description</th>
                          </tr>
                        </thead>
                        <tbody>
                          {recentSettlements.map((settlement) => (
                            <tr key={settlement._id}>
                              <td className="py-1">
                                <small>{formatDate(settlement.date)}</small>
                              </td>
                              <td className="py-1">
                                <div className="d-flex align-items-center">
                                  <div className="avatar-xs bg-success text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                    {settlement.fromUser.charAt(0)}
                                  </div>
                                  <small>{settlement.fromUser}</small>
                                </div>
                              </td>
                              <td className="py-1">
                                <div className="d-flex align-items-center">
                                  <div className="avatar-xs bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                    {settlement.toUser.charAt(0)}
                                  </div>
                                  <small>{settlement.toUser}</small>
                                </div>
                              </td>
                              <td className="py-1">
                                <small className="text-success fw-bold">₹{settlement.amount}</small>
                              </td>
                              <td className="py-1">
                                <small className="text-muted">{settlement.description || 'Settlement payment'}</small>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>
      </div>
      
      <style jsx>{`
        .avatar-sm {
          width: 30px;
          height: 30px;
          font-size: 12px;
          font-weight: bold;
        }
        .avatar-xs {
          width: 24px;
          height: 24px;
          font-size: 10px;
          font-weight: bold;
        }
      `}</style>

      {/* Add Expense Dialog */}
      {showAddExpenseDialog && (
        <div 
          className="modal show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAddExpenseDialog(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Expense</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowAddExpenseDialog(false)}
                ></button>
              </div>
              <form onSubmit={handleAddExpense}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="expense-name" className="form-label">Expense Name</label>
                    <input
                      type="text"
                      className="form-control"
                      id="expense-name"
                      value={newExpense.name}
                      onChange={(e) => setNewExpense({ ...newExpense, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="expense-amount" className="form-label">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      id="expense-amount"
                      value={newExpense.amount}
                      onChange={(e) => {
                        const amount = e.target.value;
                        const splitAmount = parseFloat(amount) / 2;
                        setNewExpense({ 
                          ...newExpense, 
                          amount,
                          // Auto-update split amounts if split is enabled
                          saketAmount: newExpense.isSplit ? splitAmount.toString() : newExpense.saketAmount,
                          ayushAmount: newExpense.isSplit ? splitAmount.toString() : newExpense.ayushAmount
                        });
                      }}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="expense-category" className="form-label">Category</label>
                    <select
                      className="form-select"
                      id="expense-category"
                      value={newExpense.category}
                      onChange={(e) => setNewExpense({ ...newExpense, category: e.target.value, subcategory: '' })}
                      required
                    >
                      <option value="">Select a category</option>
                      {Array.isArray(categories) && categories.map((category) => (
                        <option key={category._id} value={category._id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="expense-subcategory" className="form-label">Sub-category (Optional)</label>
                    <select
                      className="form-select"
                      id="expense-subcategory"
                      value={newExpense.subcategory}
                      onChange={(e) => setNewExpense({ ...newExpense, subcategory: e.target.value })}
                      disabled={!newExpense.category}
                    >
                      <option value="">Select a sub-category</option>
                      {newExpense.category && (() => {
                        const selectedCategory = categories.find(cat => cat._id === newExpense.category);
                        return selectedCategory?.subcategories?.map((subcategory: Subcategory, index: number) => (
                          <option key={index} value={subcategory.name}>
                            {subcategory.name}
                          </option>
                        )) || [];
                      })()}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="expense-paidBy" className="form-label">Paid By</label>
                    <select
                      className="form-select"
                      id="expense-paidBy"
                      value={newExpense.paidBy}
                      onChange={(e) => setNewExpense({ ...newExpense, paidBy: e.target.value })}
                      required
                    >
                      <option value="">Select who paid</option>
                      {dashboardData?.users?.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="expense-split"
                        checked={newExpense.isSplit}
                        onChange={(e) => {
                          const isSplit = e.target.checked;
                          setNewExpense({
                            ...newExpense,
                            isSplit,
                            splitBetween: isSplit ? ['saket', 'ayush'] : [],
                            saketAmount: isSplit ? (parseFloat(newExpense.amount) / 2).toString() : '',
                            ayushAmount: isSplit ? (parseFloat(newExpense.amount) / 2).toString() : ''
                          });
                        }}
                      />
                      <label className="form-check-label" htmlFor="expense-split">
                        Split this expense between users
                      </label>
                    </div>
                  </div>
                  
                  {newExpense.isSplit && (
                    <div className="mb-3">
                      <label className="form-label">Split Details</label>
                      <div className="row">
                        <div className="col-md-6">
                          <label htmlFor="saket-amount" className="form-label">Saket&apos;s Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            id="saket-amount"
                            value={newExpense.saketAmount}
                            onChange={(e) => {
                              const saketAmount = e.target.value;
                              const totalAmount = parseFloat(newExpense.amount || '0');
                              const ayushAmount = totalAmount - parseFloat(saketAmount || '0');
                              setNewExpense({ 
                                ...newExpense, 
                                saketAmount,
                                ayushAmount: ayushAmount >= 0 ? ayushAmount.toFixed(2) : '0'
                              });
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div className="col-md-6">
                          <label htmlFor="ayush-amount" className="form-label">Ayush&apos;s Amount</label>
                          <input
                            type="number"
                            step="0.01"
                            className="form-control"
                            id="ayush-amount"
                            value={newExpense.ayushAmount}
                            onChange={(e) => {
                              const ayushAmount = e.target.value;
                              const totalAmount = parseFloat(newExpense.amount || '0');
                              const saketAmount = totalAmount - parseFloat(ayushAmount || '0');
                              setNewExpense({ 
                                ...newExpense, 
                                ayushAmount,
                                saketAmount: saketAmount >= 0 ? saketAmount.toFixed(2) : '0'
                              });
                            }}
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                      <small className="text-muted">
                        Total split: ₹{(parseFloat(newExpense.saketAmount || '0') + parseFloat(newExpense.ayushAmount || '0')).toFixed(2)} 
                        {newExpense.amount && ` / ₹${parseFloat(newExpense.amount).toFixed(2)}`}
                        {Math.abs((parseFloat(newExpense.saketAmount || '0') + parseFloat(newExpense.ayushAmount || '0')) - parseFloat(newExpense.amount || '0')) > 0.01 && (
                          <span className="text-danger"> - Amounts don&apos;t match!</span>
                        )}
                      </small>
                    </div>
                  )}
                  <div className="mb-3">
                    <label htmlFor="expense-date" className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="expense-date"
                      value={newExpense.date}
                      onChange={(e) => setNewExpense({ ...newExpense, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="expense-description" className="form-label">Description (Optional)</label>
                    <textarea
                      className="form-control"
                      id="expense-description"
                      rows={3}
                      value={newExpense.description}
                      onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowAddExpenseDialog(false)}
                    disabled={operationLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-primary"
                    disabled={operationLoading}
                  >
                    {operationLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Adding...
                      </>
                    ) : (
                      'Add Expense'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Settlement Dialog */}
      {showSettlementDialog && (
        <div 
          className="modal show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowSettlementDialog(false);
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Record Settlement</h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setShowSettlementDialog(false)}
                ></button>
              </div>
              <form onSubmit={handleRecordSettlement}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label htmlFor="settlement-from" className="form-label">From</label>
                    <select
                      className="form-select"
                      id="settlement-from"
                      value={newSettlement.from}
                      onChange={(e) => {
                        const newFrom = e.target.value;
                        setNewSettlement({ 
                          ...newSettlement, 
                          from: newFrom,
                          // Clear "to" if it's the same as the new "from"
                          to: newSettlement.to === newFrom ? '' : newSettlement.to
                        });
                      }}
                      required
                    >
                      <option value="">Select who is paying</option>
                      {dashboardData?.users?.map((user) => (
                        <option key={user.id} value={user.id}>
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="settlement-to" className="form-label">To</label>
                    <select
                      className="form-select"
                      id="settlement-to"
                      value={newSettlement.to}
                      onChange={(e) => setNewSettlement({ ...newSettlement, to: e.target.value })}
                      required
                    >
                      <option value="">Select who is receiving</option>
                      {dashboardData?.users?.map((user) => (
                        <option 
                          key={user.id} 
                          value={user.id}
                          disabled={user.id === newSettlement.from}
                        >
                          {user.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="settlement-amount" className="form-label">Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      id="settlement-amount"
                      value={newSettlement.amount}
                      onChange={(e) => setNewSettlement({ ...newSettlement, amount: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="settlement-date" className="form-label">Date</label>
                    <input
                      type="date"
                      className="form-control"
                      id="settlement-date"
                      value={newSettlement.date}
                      onChange={(e) => setNewSettlement({ ...newSettlement, date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="settlement-description" className="form-label">Description (Optional)</label>
                    <textarea
                      className="form-control"
                      id="settlement-description"
                      rows={3}
                      value={newSettlement.description}
                      onChange={(e) => setNewSettlement({ ...newSettlement, description: e.target.value })}
                    ></textarea>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowSettlementDialog(false)}
                    disabled={operationLoading}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="btn btn-success"
                    disabled={operationLoading}
                  >
                    {operationLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Recording...
                      </>
                    ) : (
                      'Record Settlement'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmationDialog
        show={confirmation.show}
        title={confirmation.config?.title || ''}
        message={confirmation.config?.message || ''}
        confirmText={confirmation.config?.confirmText}
        cancelText={confirmation.config?.cancelText}
        type={confirmation.config?.type}
        onConfirm={confirmation.handleConfirm}
        onCancel={confirmation.handleCancel}
      />

      {operationLoading && (
        <div 
          className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" 
          style={{ 
            backgroundColor: 'rgba(0,0,0,0.1)', 
            zIndex: 9999,
            backdropFilter: 'blur(1px)'
          }}
        >
          <div className="bg-white rounded p-3 shadow">
            <div className="d-flex align-items-center">
              <div className="spinner-border spinner-border-sm me-2" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
              <span>Processing...</span>
            </div>
          </div>
        </div>
      )}

    </MainLayout>
  );
}
