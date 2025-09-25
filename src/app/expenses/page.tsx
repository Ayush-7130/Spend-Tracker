'use client';

import { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import MainLayout from '@/components/MainLayout';
import { useOperationNotification } from '@/contexts/NotificationContext';
import ConfirmationDialog from '@/components/ConfirmationDialog';
import { useConfirmation } from '@/hooks/useConfirmation';
import {
  formatCurrency,
  formatDate,
  fetchData,
  bulkDelete,
  buildUrlWithParams,
  PaginationData,
  createSortHandler,
  SortConfig
} from '@/lib/utils';

interface Expense {
  _id: string;
  amount: number;
  description: string;
  date: string;
  category: string;
  subcategory: string;
  paidBy: string;
  isSplit: boolean;
  splitDetails?: {
    type: string;
    saketAmount: number;
    ayushAmount: number;
  };
  categoryDetails?: {
    name: string;
  }[];
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

function ExpensesContent() {
  const searchParams = useSearchParams();
  const { notifyError, notifyDeleted, notifyAdded, notifyUpdated } = useOperationNotification();
  const confirmation = useConfirmation();
  
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    paidBy: '',
    startDate: '',
    endDate: '',
    sortBy: 'date',
    sortOrder: 'desc' as 'asc' | 'desc'
  });

  // Add Expense Dialog states
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
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
  const [submitError, setSubmitError] = useState<string | null>(null);

  const users = [
    { id: 'saket', name: 'Saket' },
    { id: 'ayush', name: 'Ayush' }
  ];

  const sortConfig: SortConfig = {
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder
  };

  const { handleSort, getSortIcon } = createSortHandler(sortConfig, (config) => {
    setFilters(prev => ({ ...prev, sortBy: config.sortBy, sortOrder: config.sortOrder }));
  });

  useEffect(() => {
    fetchCategories();
    
    // Show success message if redirected from add expense
    if (searchParams.get('success') === 'added') {
      setTimeout(() => {
        notifyAdded('Expense');
      }, 100);
    }
  }, [searchParams, notifyAdded]);

  const fetchCategories = async () => {
    const result = await fetchData<Category[]>('/api/categories');
    if (result.success && result.data) {
      setCategories(result.data);
    }
  };

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const url = buildUrlWithParams('/api/expenses', {
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search,
      category: filters.category,
      paidBy: filters.paidBy,
      startDate: filters.startDate,
      endDate: filters.endDate,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder
    });

    const result = await fetchData<{ expenses: Expense[]; pagination: PaginationData }>(url);
    if (result.success && result.data) {
      setExpenses(result.data.expenses);
      setPagination(result.data.pagination);
    }
    setLoading(false);
  }, [pagination.page, pagination.limit, filters]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSelectExpense = (expenseId: string) => {
    setSelectedExpenses(prev => 
      prev.includes(expenseId) 
        ? prev.filter(id => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const handleSelectAll = () => {
    setSelectedExpenses(
      selectedExpenses.length === expenses.length 
        ? [] 
        : expenses.map(exp => exp._id)
    );
  };

  const handleBulkDelete = async () => {
    const result = await bulkDelete(selectedExpenses, '/api/expenses', 'expenses');
    if (result.success) {
      setSelectedExpenses([]);
      fetchExpenses();
      notifyDeleted(`${selectedExpenses.length} expense(s)`);
    } else if (result.error && result.error !== 'Cancelled by user') {
      notifyError('Delete', result.error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = await confirmation.confirm({
      title: 'Delete Expense',
      message: 'Are you sure you want to delete this expense? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!confirmed) return;
    
    setOperationLoading(true);
    
    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: 'DELETE'
      });
      
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || 'Failed to delete expense');
      }
      
      fetchExpenses();
      notifyDeleted('Expense');
    } catch (error) {
      console.error('Error deleting expense:', error);
      notifyError('Delete', error instanceof Error ? error.message : 'Failed to delete expense');
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      name: expense.description,
      amount: expense.amount.toString(),
      description: expense.description,
      date: expense.date.split('T')[0], // Convert to YYYY-MM-DD format
      category: expense.category,
      subcategory: expense.subcategory || '',
      paidBy: expense.paidBy,
      splitBetween: expense.isSplit ? ['saket', 'ayush'] : [],
      isSplit: expense.isSplit,
      saketAmount: expense.splitDetails?.saketAmount?.toString() || '',
      ayushAmount: expense.splitDetails?.ayushAmount?.toString() || ''
    });
    setShowAddExpenseDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddExpenseDialog(false);
    setEditingExpense(null);
    setSubmitError(null);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
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
          setSubmitError(`Split amounts (₹${splitTotal.toFixed(2)}) must equal total amount (₹${totalAmount.toFixed(2)})`);
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

      // Determine if this is an edit or create operation
      const isEditing = editingExpense !== null;
      const url = isEditing ? `/api/expenses/${editingExpense._id}` : '/api/expenses';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(expenseData)
      });
      
      if (response.ok) {
        handleCloseDialog();
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
        fetchExpenses();
        if (isEditing) {
          notifyUpdated('Expense');
        } else {
          notifyAdded('Expense');
        }
      } else {
        const errorData = await response.json();
        setSubmitError(errorData.error || `Failed to ${isEditing ? 'update' : 'add'} expense`);
      }
    } catch {
      setSubmitError(`Failed to ${editingExpense ? 'update' : 'add'} expense`);
    } finally {
      setOperationLoading(false);
    }
  };  return (
    <MainLayout>
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="bi bi-list-ul me-2"></i>
              Expenses
            </h1>
            <button 
              onClick={() => {
                setEditingExpense(null);
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
                setShowAddExpenseDialog(true);
              }} 
              className="btn btn-primary"
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Expense
            </button>
          </div>

          {/* Filters */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search description..."
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                  >
                    <option value="">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat._id} value={cat._id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="col-md-2">
                  <select
                    className="form-select"
                    value={filters.paidBy}
                    onChange={(e) => handleFilterChange('paidBy', e.target.value)}
                  >
                    <option value="">All Users</option>
                    <option value="saket">Saket</option>
                    <option value="ayush">Ayush</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <input
                    type="date"
                    className="form-control"
                    placeholder="Start Date"
                    value={filters.startDate}
                    onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <input
                    type="date"
                    className="form-control"
                    placeholder="End Date"
                    value={filters.endDate}
                    onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  />
                </div>
                <div className="col-md-1">
                  <button
                    className="btn btn-outline-secondary w-100"
                    onClick={() => {
                      setFilters({
                        search: '',
                        category: '',
                        paidBy: '',
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

          {/* Bulk Actions */}
          {selectedExpenses.length > 0 && (
            <div className="alert alert-info d-flex justify-content-between align-items-center">
              <span>{selectedExpenses.length} expense(s) selected</span>
              <button
                className="btn btn-danger btn-sm"
                onClick={handleBulkDelete}
              >
                <i className="bi bi-trash me-1"></i>
                Delete Selected
              </button>
            </div>
          )}

          {/* Expenses Table */}
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border" role="status">
                    <span className="visually-hidden">Loading...</span>
                  </div>
                </div>
              ) : expenses.length === 0 ? (
                <div className="text-center py-4">
                  <i className="bi bi-inbox fs-1 text-muted"></i>
                  <p className="text-muted mt-2">No expenses found</p>
                  <button 
                    onClick={() => {
                      setEditingExpense(null);
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
                      setShowAddExpenseDialog(true);
                    }} 
                    className="btn btn-primary"
                  >
                    Add your first expense
                  </button>
                </div>
              ) : (
                <>
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead>
                        <tr>
                          <th>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={selectedExpenses.length === expenses.length && expenses.length > 0}
                              onChange={handleSelectAll}
                            />
                          </th>
                          <th
                            className="cursor-pointer"
                            onClick={() => handleSort('date')}
                          >
                            Date <i className={`bi ${getSortIcon('date')}`}></i>
                          </th>
                          <th>Description</th>
                          <th>Category</th>
                          <th
                            className="cursor-pointer"
                            onClick={() => handleSort('amount')}
                          >
                            Amount <i className={`bi ${getSortIcon('amount')}`}></i>
                          </th>
                          <th>Paid By</th>
                          <th>Split</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {expenses.map((expense) => (
                          <tr key={expense._id}>
                            <td>
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={selectedExpenses.includes(expense._id)}
                                onChange={() => handleSelectExpense(expense._id)}
                              />
                            </td>
                            <td>{formatDate(expense.date)}</td>
                            <td>
                              <div>
                                <strong>{expense.description}</strong>
                                {expense.subcategory && (
                                  <small className="text-muted d-block">
                                    {expense.subcategory}
                                  </small>
                                )}
                              </div>
                            </td>
                            <td>
                              <span className="badge bg-secondary">
                                {expense.categoryDetails?.[0]?.name || expense.category}
                              </span>
                            </td>
                            <td>
                              <strong>{formatCurrency(expense.amount)}</strong>
                              {expense.isSplit && (
                                <small className="text-muted d-block">
                                  Split: S₹{expense.splitDetails?.saketAmount} / A₹{expense.splitDetails?.ayushAmount}
                                </small>
                              )}
                            </td>
                            <td>
                              <span className={`badge ${expense.paidBy === 'saket' ? 'bg-primary' : 'bg-success'}`}>
                                {expense.paidBy === 'saket' ? 'Saket' : 'Ayush'}
                              </span>
                            </td>
                            <td>
                              {expense.isSplit ? (
                                <span className="badge bg-warning">Split</span>
                              ) : (
                                <span className="badge bg-light text-dark">Personal</span>
                              )}
                            </td>
                            <td>
                              <div className="dropdown">
                                <button
                                  className="btn btn-sm btn-outline-secondary dropdown-toggle"
                                  type="button"
                                  data-bs-toggle="dropdown"
                                >
                                  <i className="bi bi-three-dots"></i>
                                </button>
                                <ul className="dropdown-menu">
                                  <li>
                                    <button
                                      className="dropdown-item"
                                      onClick={() => handleEditExpense(expense)}
                                    >
                                      <i className="bi bi-pencil me-2"></i>Edit
                                    </button>
                                  </li>
                                  <li>
                                    <button
                                      className="dropdown-item text-danger"
                                      onClick={() => handleDeleteExpense(expense._id)}
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

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="text-muted">
                        Showing {((pagination.page - 1) * pagination.limit) + 1} to{' '}
                        {Math.min(pagination.page * pagination.limit, pagination.total)} of{' '}
                        {pagination.total} entries
                      </span>
                      
                      <nav>
                        <ul className="pagination mb-0">
                          <li className={`page-item ${pagination.page === 1 ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                              disabled={pagination.page === 1}
                            >
                              Previous
                            </button>
                          </li>
                          
                          {[...Array(pagination.pages)].map((_, i) => {
                            const page = i + 1;
                            if (
                              page === 1 ||
                              page === pagination.pages ||
                              (page >= pagination.page - 2 && page <= pagination.page + 2)
                            ) {
                              return (
                                <li
                                  key={page}
                                  className={`page-item ${pagination.page === page ? 'active' : ''}`}
                                >
                                  <button
                                    className="page-link"
                                    onClick={() => setPagination(prev => ({ ...prev, page }))}
                                  >
                                    {page}
                                  </button>
                                </li>
                              );
                            } else if (page === pagination.page - 3 || page === pagination.page + 3) {
                              return (
                                <li key={page} className="page-item disabled">
                                  <span className="page-link">...</span>
                                </li>
                              );
                            }
                            return null;
                          })}
                          
                          <li className={`page-item ${pagination.page === pagination.pages ? 'disabled' : ''}`}>
                            <button
                              className="page-link"
                              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                              disabled={pagination.page === pagination.pages}
                            >
                              Next
                            </button>
                          </li>
                        </ul>
                      </nav>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Dialog */}
      {showAddExpenseDialog && (
        <div 
          className="modal show" 
          style={{ display: 'block', backgroundColor: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(5px)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              handleCloseDialog();
            }
          }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingExpense ? 'Edit Expense' : 'Add New Expense'}
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={handleCloseDialog}
                ></button>
              </div>
              <form onSubmit={handleAddExpense}>
                <div className="modal-body">
                  {submitError && (
                    <div className="alert alert-danger" role="alert">
                      {submitError}
                    </div>
                  )}
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
                      {users.map((user) => (
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
                    onClick={handleCloseDialog}
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
                        {editingExpense ? 'Updating...' : 'Adding...'}
                      </>
                    ) : (
                      editingExpense ? 'Update Expense' : 'Add Expense'
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

export default function ExpensesPage() {
  return (
    <Suspense fallback={
      <MainLayout>
        <div className="max-w-7xl mx-auto p-4">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold">Expenses</h1>
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <div className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </MainLayout>
    }>
      <ExpensesContent />
    </Suspense>
  );
}
