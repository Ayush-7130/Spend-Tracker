'use client';

import React, { useState, useEffect, useCallback } from 'react';
import MainLayout from '@/components/MainLayout';
import { useOperationNotification } from '@/contexts/NotificationContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useConfirmation } from '@/hooks/useConfirmation';

interface Settlement {
  _id: string;
  expenseId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: string;
  status: string;
}

interface Balance {
  fromUser: string;
  toUser: string;
  amount: number;
  status: 'owes' | 'settled';
}

interface BalanceData {
  balances: Balance[];
  summary: {
    totalOwed: number;
    totalSettled: number;
    totalTransactions: number;
    activeBalances: number;
  };
}

const SettlementsPage: React.FC = () => {
  const { notifyError, notifyDeleted, notifyAdded } = useOperationNotification();
  const confirmation = useConfirmation();
  
  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [filteredSettlements, setFilteredSettlements] = useState<Settlement[]>([]);
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    search: '',
    fromUser: '',
    toUser: '',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    sortOrder: 'desc'
  });

  // Record Settlement Dialog states
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    from: '',
    to: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const users = [
    { id: 'saket', name: 'Saket' },
    { id: 'ayush', name: 'Ayush' }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...settlements];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(settlement =>
        settlement.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
        settlement.fromUser.toLowerCase().includes(filters.search.toLowerCase()) ||
        settlement.toUser.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // From user filter
    if (filters.fromUser) {
      filtered = filtered.filter(settlement =>
        settlement.fromUser.toLowerCase() === filters.fromUser.toLowerCase()
      );
    }

    // To user filter
    if (filters.toUser) {
      filtered = filtered.filter(settlement =>
        settlement.toUser.toLowerCase() === filters.toUser.toLowerCase()
      );
    }

    // Date range filters
    if (filters.startDate) {
      filtered = filtered.filter(settlement =>
        new Date(settlement.date) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(settlement =>
        new Date(settlement.date) <= new Date(filters.endDate)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;
      
      switch (filters.sortBy) {
        case 'date':
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case 'amount':
          aValue = a.amount;
          bValue = b.amount;
          break;
        case 'fromUser':
          aValue = a.fromUser.toLowerCase();
          bValue = b.fromUser.toLowerCase();
          break;
        case 'toUser':
          aValue = a.toUser.toLowerCase();
          bValue = b.toUser.toLowerCase();
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (filters.sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredSettlements(filtered);
  }, [settlements, filters]);

  useEffect(() => {
    // Apply filters whenever settlements or filters change
    applyFilters();
  }, [settlements, filters, applyFilters]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleSort = (column: string) => {
    const newOrder = filters.sortBy === column && filters.sortOrder === 'desc' ? 'asc' : 'desc';
    setFilters(prev => ({ ...prev, sortBy: column, sortOrder: newOrder }));
  };

  const getSortIcon = (column: string) => {
    if (filters.sortBy !== column) return 'bi-arrow-down-up';
    return filters.sortOrder === 'asc' ? 'bi-arrow-up' : 'bi-arrow-down';
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settlementsRes, balancesRes] = await Promise.all([
        fetch('/api/settlements'),
        fetch('/api/settlements/balance')
      ]);

      if (!settlementsRes.ok || !balancesRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const settlementsData = await settlementsRes.json();
      const balancesData = await balancesRes.json();

      setSettlements(settlementsData);
      setBalances(balancesData);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred');
      console.error('Error fetching settlements data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Optimized refresh for partial updates after CRUD operations
  const refreshSettlements = async () => {
    try {
      const [settlementsRes, balancesRes] = await Promise.all([
        fetch('/api/settlements'),
        fetch('/api/settlements/balance')
      ]);

      if (!settlementsRes.ok || !balancesRes.ok) {
        throw new Error('Failed to fetch updated data');
      }

      const settlementsData = await settlementsRes.json();
      const balancesData = await balancesRes.json();

      // Update state without loading indicators for smoother UX
      setSettlements(settlementsData);
      setBalances(balancesData);
    } catch (error) {
      console.error('Error refreshing settlements:', error);
      // Fall back to full refresh if partial update fails
      await fetchData();
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setOperationLoading(true);
    
    // Validation: Check if from and to users are the same
    if (newSettlement.from === newSettlement.to) {
      setSubmitError('From and To users cannot be the same person');
      setOperationLoading(false);
      return;
    }
    
    // Validation: Check if amount is valid
    const amount = parseFloat(newSettlement.amount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError('Please enter a valid amount greater than 0');
      setOperationLoading(false);
      return;
    }
    
    try {
      // Convert IDs to proper names
      const getUserName = (id: string) => {
        const user = users.find(u => u.id === id);
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
        // Refresh data with optimized approach
        await refreshSettlements();
        setSubmitError(null); // Clear any previous errors
        notifyAdded('Settlement');
      } else {
        const errorData = await response.json();
        setSubmitError(errorData.error || 'Failed to record settlement');
      }
    } catch {
      setSubmitError('Error recording settlement');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Settlement',
      message: 'Are you sure you want to delete this settlement? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!confirmed) return;
    
    setOperationLoading(true);
    
    try {
      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: 'DELETE'
      });
      
      if (response.ok) {
        // Refresh data with optimized approach
        await refreshSettlements();
        notifyDeleted('Settlement');
      } else {
        const errorData = await response.json();
        notifyError('Delete', errorData.error || 'Failed to delete settlement');
      }
    } catch (error) {
      console.error('Error deleting settlement:', error);
      notifyError('Delete', 'Failed to delete settlement');
    } finally {
      setOperationLoading(false);
    }
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
              <p className="mt-3 text-muted">Loading settlement data and balances...</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="containerx-fluid">
        <div className="row">
          <div className="col-12">
            {/* Header Section */}
            <div className="d-flex justify-content-between align-items-center mb-4">
              <div>
                <h1 className="h3 mb-0">
                  <i className="bi bi-currency-exchange me-2"></i>
                  Settlements
                </h1>
              </div>
              <div>
                <button 
                  onClick={() => setShowSettlementDialog(true)} 
                  className="btn btn-primary"
                >
                  <i className="bi bi-plus-circle me-2"></i>
                  Record Settlement
                </button>
              </div>
            </div>

          {error && (
            <div className="alert alert-danger alert-dismissible" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {/* Summary Statistics */}
          {balances && (
            <div className="row mb-3">
              <div className="col-md-3">
                <div className="card border-danger">
                  <div className="card-body py-2 px-3 text-center">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="bi bi-exclamation-triangle text-danger fs-5 me-2"></i>
                      <div>
                        <h5 className="mb-0 text-danger">₹{balances.summary.totalOwed}</h5>
                        <small className="text-muted">Outstanding</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-success">
                  <div className="card-body py-2 px-3 text-center">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="bi bi-check-circle text-success fs-5 me-2"></i>
                      <div>
                        <h5 className="mb-0 text-success">₹{balances.summary.totalSettled}</h5>
                        <small className="text-muted">Settled</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-primary">
                  <div className="card-body py-2 px-3 text-center">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="bi bi-receipt text-primary fs-5 me-2"></i>
                      <div>
                        <h5 className="mb-0 text-primary">{balances.summary.totalTransactions}</h5>
                        <small className="text-muted">Transactions</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card border-warning">
                  <div className="card-body py-2 px-3 text-center">
                    <div className="d-flex align-items-center justify-content-center">
                      <i className="bi bi-hourglass-split text-warning fs-5 me-2"></i>
                      <div>
                        <h5 className="mb-0 text-warning">{balances.summary.activeBalances}</h5>
                        <small className="text-muted">Active</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Current Balances */}
          {balances && balances.balances.length > 0 && (
            <div className="card mb-3">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-balance-scale me-2"></i>
                  Outstanding Balances
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>From</th>
                        <th>To</th>
                        <th>Amount</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.balances
                        .filter(balance => balance.status === 'owes')
                        .map((balance, index) => (
                        <tr key={index}>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-xs bg-danger text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: '24px', height: '24px', fontSize: '10px'}}>
                                {balance.fromUser.charAt(0).toUpperCase()}
                              </div>
                              <span>{balance.fromUser.charAt(0).toUpperCase() + balance.fromUser.slice(1).toLowerCase()}</span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-xs bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: '24px', height: '24px', fontSize: '10px'}}>
                                {balance.toUser.charAt(0).toUpperCase()}
                              </div>
                              <span>{balance.toUser.charAt(0).toUpperCase() + balance.toUser.slice(1).toLowerCase()}</span>
                            </div>
                          </td>
                          <td>
                            <span className="fw-bold text-danger">₹{balance.amount}</span>
                          </td>
                          <td>
                            <span className="badge bg-warning">
                              <i className="bi bi-clock me-1"></i>
                              Outstanding
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {balances && balances.balances.length === 0 && (
            <div className="card mb-3">
              <div className="card-body text-center py-5">
                <i className="bi bi-check-circle-fill text-success display-1"></i>
                <h4 className="mt-3 text-success">All Settled Up!</h4>
                <p className="text-muted">No outstanding balances between users</p>
              </div>
            </div>
          )}

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search settlements..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.fromUser}
                    onChange={(e) => handleFilterChange('fromUser', e.target.value)}
                  >
                    <option value="">All From Users</option>
                    <option value="Saket">Saket</option>
                    <option value="Ayush">Ayush</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.toUser}
                    onChange={(e) => handleFilterChange('toUser', e.target.value)}
                  >
                    <option value="">All To Users</option>
                    <option value="Saket">Saket</option>
                    <option value="Ayush">Ayush</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <div className="position-relative">
                    <input
                      type="date"
                      id="startDate"
                      className="form-control"
                      value={filters.startDate}
                      onChange={(e) => handleFilterChange('startDate', e.target.value)}
                      style={!filters.startDate ? { color: 'transparent' } : {}}
                    />
                    {!filters.startDate && (
                      <span 
                        className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                        style={{ pointerEvents: 'none', fontSize: '14px' }}
                      >
                        Start Date
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-md-2">
                  <div className="position-relative">
                    <input
                      type="date"
                      id="endDate"
                      className="form-control"
                      value={filters.endDate}
                      onChange={(e) => handleFilterChange('endDate', e.target.value)}
                      style={!filters.endDate ? { color: 'transparent' } : {}}
                    />
                    {!filters.endDate && (
                      <span 
                        className="position-absolute top-50 start-0 translate-middle-y ms-3 text-muted"
                        style={{ pointerEvents: 'none', fontSize: '14px' }}
                      >
                        End Date
                      </span>
                    )}
                  </div>
                </div>
                <div className="col-md-1">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      setFilters({
                        search: '',
                        fromUser: '',
                        toUser: '',
                        startDate: '',
                        endDate: '',
                        sortBy: 'date',
                        sortOrder: 'desc'
                      });
                    }}
                  >
                    Clear
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Full Settlement Table */}
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">
                <i className="bi bi-table me-2"></i>
                All Settlements
              </h5>
            </div>
            <div className="card-body p-0" style={{ overflowX: 'auto', overflowY: 'visible' }}>
              {filteredSettlements.length > 0 ? (
                <div className="table-responsive" style={{ overflow: 'visible' }}>
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th 
                          className="cursor-pointer user-select-none"
                          onClick={() => handleSort('date')}
                        >
                          Date <i className={`bi ${getSortIcon('date')} ms-1`}></i>
                        </th>
                        <th 
                          className="cursor-pointer user-select-none"
                          onClick={() => handleSort('fromUser')}
                        >
                          From <i className={`bi ${getSortIcon('fromUser')} ms-1`}></i>
                        </th>
                        <th 
                          className="cursor-pointer user-select-none"
                          onClick={() => handleSort('toUser')}
                        >
                          To <i className={`bi ${getSortIcon('toUser')} ms-1`}></i>
                        </th>
                        <th 
                          className="cursor-pointer user-select-none"
                          onClick={() => handleSort('amount')}
                        >
                          Amount <i className={`bi ${getSortIcon('amount')} ms-1`}></i>
                        </th>
                        <th>Description</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredSettlements.map((settlement) => (
                        <tr key={settlement._id}>
                          <td>
                            <span className="text-muted">
                              {new Date(settlement.date).toLocaleDateString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric'
                              })}
                            </span>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-xs bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: '24px', height: '24px', fontSize: '10px'}}>
                                {settlement.fromUser.charAt(0).toUpperCase()}
                              </div>
                              <span>{settlement.fromUser.charAt(0).toUpperCase() + settlement.fromUser.slice(1).toLowerCase()}</span>
                            </div>
                          </td>
                          <td>
                            <div className="d-flex align-items-center">
                              <div className="avatar-xs bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2" style={{width: '24px', height: '24px', fontSize: '10px'}}>
                                {settlement.toUser.charAt(0).toUpperCase()}
                              </div>
                              <span>{settlement.toUser.charAt(0).toUpperCase() + settlement.toUser.slice(1).toLowerCase()}</span>
                            </div>
                          </td>
                          <td>
                            <span className="fw-bold text-success">₹{settlement.amount}</span>
                          </td>
                          <td>
                            <span className="text-muted">{settlement.description || 'Settlement payment'}</span>
                          </td>
                          <td>
                            <span className="badge bg-success">
                              <i className="bi bi-check-circle me-1"></i>
                              Settled
                            </span>
                          </td>
                          <td>
                            <div className="dropdown">
                              <button
                                className="btn btn-sm btn-outline-secondary dropdown-toggle"
                                type="button"
                                data-bs-toggle="dropdown"
                                data-bs-auto-close="true"
                                data-bs-boundary="viewport"
                                aria-expanded="false"
                              >
                                <i className="bi bi-three-dots"></i>
                              </button>
                              <ul className="dropdown-menu dropdown-menu-end">
                                <li>
                                  <button
                                    className="dropdown-item text-danger"
                                    onClick={() => handleDeleteSettlement(settlement._id)}
                                  >
                                    <i className="bi bi-trash me-2"></i>Delete
                                  </button>
                                </li>
                              </ul>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-5">
                  <i className="bi bi-inbox text-muted display-4"></i>
                  <h4 className="mt-3 text-muted">No Settlements Yet</h4>
                  <p className="text-muted mb-3">Settlement history will appear here</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setShowSettlementDialog(true)}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Record your first settlement
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
      
      <style jsx>{`
        .avatar-circle {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 16px;
        }
        .card {
          transition: all 0.2s ease-in-out;
        }
        .cursor-pointer {
          cursor: pointer;
        }
        .user-select-none {
          user-select: none;
        }
        .card:hover {
          box-shadow: 0 4px 8px rgba(0,0,0,0.1) !important;
        }
        .dropdown-menu {
          z-index: 1060 !important;
          position: absolute !important;
          transform: translateY(-50%) !important;
          box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
          border: 1px solid rgba(0, 0, 0, 0.1) !important;
        }
        .dropdown.show .dropdown-menu {
          display: block !important;
          z-index: 1060 !important;
        }
        .table-responsive {
          overflow: visible !important;
        }
        .table {
          position: relative;
        }
        .table tbody tr {
          position: relative;
        }
        .table tbody tr:hover {
          z-index: 10;
        }
        .dropdown {
          position: static !important;
        }
        .dropdown-toggle::after {
          display: none;
        }
      `}</style>

      {/* Record Settlement Dialog */}
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
                  {submitError && (
                    <div className="alert alert-danger" role="alert">
                      {submitError}
                    </div>
                  )}
                  <div className="mb-3">
                    <label htmlFor="settlement-from" className="form-label">From</label>
                    <select
                      className="form-select"
                      id="settlement-from"
                      value={newSettlement.from}
                      onChange={(e) => {
                        const newFrom = e.target.value;
                        // If the selected 'from' is the same as 'to', clear 'to'
                        const updatedTo = newFrom === newSettlement.to ? '' : newSettlement.to;
                        setNewSettlement({ ...newSettlement, from: newFrom, to: updatedTo });
                      }}
                      required
                    >
                      <option value="">Select who is paying</option>
                      {users.map((user) => (
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
                      <option value="">Select who will receive</option>
                      {users.filter(user => user.id !== newSettlement.from).map((user) => (
                        <option key={user.id} value={user.id}>
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
                      placeholder="Optional note about this settlement..."
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
                    className="btn btn-primary"
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
      </div>
    </MainLayout>
  );
};

export default SettlementsPage;
