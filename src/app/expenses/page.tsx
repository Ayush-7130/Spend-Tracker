"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { useOperationNotification } from "@/contexts/NotificationContext";
import { useCategories } from "@/contexts/CategoriesContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import {
  Modal,
  FilterPanel,
  UserBadge,
  StatusBadge,
  LoadingSpinner,
  Table,
  InputField,
  SelectField,
  DateField,
  CheckboxField,
  FormGroup,
  TextareaField,
  EmptyState,
  Badge,
} from "@/shared/components";
import {
  formatCurrency,
  formatDate,
  fetchData,
  bulkDelete,
  buildUrlWithParams,
  PaginationData,
  createSortHandler,
  SortConfig,
} from "@/lib/utils";

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

function ExpensesContent() {
  const searchParams = useSearchParams();
  const { notifyError, notifyDeleted, notifyAdded, notifyUpdated } =
    useOperationNotification();
  const { categories } = useCategories(); // Use categories context
  const confirmation = useConfirmation();

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [selectedExpenses, setSelectedExpenses] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    search: "",
    category: "",
    paidBy: "",
    startDate: "",
    endDate: "",
    sortBy: "date",
    sortOrder: "desc" as "asc" | "desc",
  });

  // Add Expense Dialog states
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [newExpense, setNewExpense] = useState({
    name: "",
    amount: "",
    description: "",
    date: new Date().toISOString().split("T")[0],
    category: "",
    subcategory: "",
    paidBy: "",
    splitBetween: [] as string[],
    isSplit: false,
    saketAmount: "",
    ayushAmount: "",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [manualSplitEdit, setManualSplitEdit] = useState(false);

  const users = [
    { id: "saket", name: "Saket" },
    { id: "ayush", name: "Ayush" },
  ];

  const sortConfig: SortConfig = {
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  };

  // Sort handlers - currently not used but kept for future implementation
  const { handleSort: _handleSort, getSortIcon: _getSortIcon } = createSortHandler(
    sortConfig,
    (config) => {
      setFilters((prev) => ({
        ...prev,
        sortBy: config.sortBy,
        sortOrder: config.sortOrder,
      }));
    }
  );

  // Categories are now managed by CategoriesContext - no need to fetch here

  useEffect(() => {
    // Show success message if redirected from add expense
    if (searchParams.get("success") === "added") {
      setTimeout(() => {
        notifyAdded("Expense");
      }, 100);
    }
  }, [searchParams, notifyAdded]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const url = buildUrlWithParams("/api/expenses", {
      page: pagination.page,
      limit: pagination.limit,
      search: filters.search,
      category: filters.category,
      paidBy: filters.paidBy,
      startDate: filters.startDate,
      endDate: filters.endDate,
      sortBy: filters.sortBy,
      sortOrder: filters.sortOrder,
    });

    const result = await fetchData<{
      expenses: Expense[];
      pagination: PaginationData;
    }>(url);
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
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Selection handlers - currently not used but kept for future implementation
  const _handleSelectExpense = (expenseId: string) => {
    setSelectedExpenses((prev) =>
      prev.includes(expenseId)
        ? prev.filter((id) => id !== expenseId)
        : [...prev, expenseId]
    );
  };

  const _handleSelectAll = () => {
    setSelectedExpenses(
      selectedExpenses.length === expenses.length
        ? []
        : expenses.map((exp) => exp._id)
    );
  };

  const handleBulkDelete = async () => {
    const result = await bulkDelete(
      selectedExpenses,
      "/api/expenses",
      "expenses"
    );
    if (result.success) {
      setSelectedExpenses([]);
      fetchExpenses();
      notifyDeleted(`${selectedExpenses.length} expense(s)`);
    } else if (result.error && result.error !== "Cancelled by user") {
      notifyError("Delete", result.error);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    const confirmed = await confirmation.confirm({
      title: "Delete Expense",
      message:
        "Are you sure you want to delete this expense? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
    });

    if (!confirmed) return;

    setOperationLoading(true);

    try {
      const response = await fetch(`/api/expenses/${expenseId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete expense");
      }

      fetchExpenses();
      notifyDeleted("Expense");
    } catch (error) {
      console.error("Error deleting expense:", error);
      notifyError(
        "Delete",
        error instanceof Error ? error.message : "Failed to delete expense"
      );
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
      date: expense.date.split("T")[0], // Convert to YYYY-MM-DD format
      category: expense.category,
      subcategory: expense.subcategory || "",
      paidBy: expense.paidBy,
      splitBetween: expense.isSplit ? ["saket", "ayush"] : [],
      isSplit: expense.isSplit,
      saketAmount: expense.splitDetails?.saketAmount?.toString() || "",
      ayushAmount: expense.splitDetails?.ayushAmount?.toString() || "",
    });
    // If editing an expense with split, mark as manually edited
    setManualSplitEdit(expense.isSplit);
    setShowAddExpenseDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddExpenseDialog(false);
    setEditingExpense(null);
    setSubmitError(null);
    setManualSplitEdit(false);
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setOperationLoading(true);

    try {
      const totalAmount = parseFloat(newExpense.amount);

      // Calculate split details if expense is split
      let splitDetails: { saketAmount?: number; ayushAmount?: number } | null =
        null;
      const isSplit = newExpense.isSplit;

      if (isSplit) {
        const saketAmount = parseFloat(newExpense.saketAmount || "0");
        const ayushAmount = parseFloat(newExpense.ayushAmount || "0");
        const splitTotal = saketAmount + ayushAmount;

        // Validate split amounts
        if (Math.abs(splitTotal - totalAmount) > 0.01) {
          setSubmitError(
            `Split amounts (₹${splitTotal.toFixed(
              2
            )}) must equal total amount (₹${totalAmount.toFixed(2)})`
          );
          return;
        }

        splitDetails = {
          saketAmount,
          ayushAmount,
        };
      }

      const expenseData = {
        description: newExpense.name, // API expects 'description', not 'name'
        amount: totalAmount,
        date: newExpense.date,
        category: newExpense.category,
        subcategory: newExpense.subcategory || "",
        paidBy: newExpense.paidBy,
        isSplit,
        splitDetails,
      };

      // Determine if this is an edit or create operation
      const isEditing = editingExpense !== null;
      const url = isEditing
        ? `/api/expenses/${editingExpense._id}`
        : "/api/expenses";
      const method = isEditing ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        handleCloseDialog();
        setNewExpense({
          name: "",
          amount: "",
          description: "",
          date: new Date().toISOString().split("T")[0],
          category: "",
          subcategory: "",
          paidBy: "",
          splitBetween: [],
          isSplit: false,
          saketAmount: "",
          ayushAmount: "",
        });
        setManualSplitEdit(false);
        fetchExpenses();
        if (isEditing) {
          notifyUpdated("Expense");
        } else {
          notifyAdded("Expense");
        }
      } else {
        const errorData = await response.json();
        setSubmitError(
          errorData.error || `Failed to ${isEditing ? "update" : "add"} expense`
        );
      }
    } catch {
      setSubmitError(`Failed to ${editingExpense ? "update" : "add"} expense`);
    } finally {
      setOperationLoading(false);
    }
  };
  return (
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
                  name: "",
                  amount: "",
                  description: "",
                  date: new Date().toISOString().split("T")[0],
                  category: "",
                  subcategory: "",
                  paidBy: "",
                  splitBetween: [],
                  isSplit: false,
                  saketAmount: "",
                  ayushAmount: "",
                });
                setManualSplitEdit(false);
                setShowAddExpenseDialog(true);
              }}
              className="btn btn-primary"
            >
              <i className="bi bi-plus-circle me-2"></i>
              Add Expense
            </button>
          </div>

          {/* Filters */}
          <FilterPanel
            filters={[
              {
                key: "search",
                type: "text",
                label: "Search",
                placeholder: "Search description...",
                colSize: 3,
              },
              {
                key: "category",
                type: "select",
                label: "Category",
                options: categories.map((cat) => ({
                  label: cat.name,
                  value: cat._id,
                })),
                colSize: 2,
              },
              {
                key: "paidBy",
                type: "select",
                label: "User",
                options: [
                  { label: "Saket", value: "saket" },
                  { label: "Ayush", value: "ayush" },
                ],
                colSize: 2,
              },
              {
                key: "startDate",
                type: "date",
                label: "Start Date",
                colSize: 2,
              },
              {
                key: "endDate",
                type: "date",
                label: "End Date",
                colSize: 2,
              },
            ]}
            values={filters}
            onChange={handleFilterChange}
            onClear={() => {
              setFilters({
                search: "",
                category: "",
                paidBy: "",
                startDate: "",
                endDate: "",
                sortBy: "date",
                sortOrder: "desc",
              });
            }}
          />

          {/* Expenses Table */}
          <div className="card">
            <div className="card-body">
              {loading ? (
                <div className="text-center py-4">
                  <LoadingSpinner
                    config={{
                      size: "medium",
                      text: "Loading expenses...",
                      showText: true,
                      variant: "primary",
                      centered: true,
                    }}
                  />
                </div>
              ) : expenses.length === 0 ? (
                <EmptyState
                  icon="📋"
                  title="No expenses found"
                  description="Create your first expense to start tracking your spending."
                  size="medium"
                  actions={[
                    {
                      label: "Add Expense",
                      onClick: () => {
                        setEditingExpense(null);
                        setNewExpense({
                          name: "",
                          amount: "",
                          description: "",
                          date: new Date().toISOString().split("T")[0],
                          category: "",
                          subcategory: "",
                          paidBy: "",
                          splitBetween: [],
                          isSplit: false,
                          saketAmount: "",
                          ayushAmount: "",
                        });
                        setShowAddExpenseDialog(true);
                      },
                      variant: "primary",
                      icon: "plus",
                    },
                  ]}
                />
              ) : (
                <>
                  <Table
                    config={{
                      columns: [
                        {
                          key: "date",
                          header: "Date",
                          accessor: "date",
                          sortable: true,
                          render: (value) => formatDate(value),
                        },
                        {
                          key: "description",
                          header: "Description",
                          accessor: "description",
                          render: (value, row) => (
                            <div>
                              <strong>{value}</strong>
                              {row.subcategory && (
                                <small className="text-muted d-block">
                                  {row.subcategory}
                                </small>
                              )}
                            </div>
                          ),
                        },
                        {
                          key: "category",
                          header: "Category",
                          render: (value, row) => (
                            <Badge variant="secondary">
                              {row.categoryDetails?.[0]?.name || row.category}
                            </Badge>
                          ),
                        },
                        {
                          key: "amount",
                          header: "Amount",
                          accessor: "amount",
                          sortable: true,
                          render: (value, row) => (
                            <div>
                              <strong>{formatCurrency(value)}</strong>
                              {row.isSplit && (
                                <small className="text-muted d-block">
                                  Split: S₹{row.splitDetails?.saketAmount} / A₹
                                  {row.splitDetails?.ayushAmount}
                                </small>
                              )}
                            </div>
                          ),
                        },
                        {
                          key: "paidBy",
                          header: "Paid By",
                          accessor: "paidBy",
                          render: (value) => (
                            <UserBadge user={value as "saket" | "ayush"} />
                          ),
                        },
                        {
                          key: "split",
                          header: "Split",
                          render: (value, row) => (
                            <StatusBadge
                              status={row.isSplit ? "split" : "personal"}
                              type="split"
                            />
                          ),
                        },
                      ],
                      data: expenses,
                      keyExtractor: (expense) => expense._id,
                      sortable: true,
                      selectable: true,
                      paginated: true,
                      defaultSort: {
                        column: filters.sortBy,
                        direction: filters.sortOrder,
                      },
                      selection: {
                        enabled: true,
                        selectedRows: expenses.filter((expense) =>
                          selectedExpenses.includes(expense._id)
                        ),
                        onSelectionChange: (selected) => {
                          setSelectedExpenses(
                            selected.map((expense) => expense._id)
                          );
                        },
                        selectAll: true,
                        getRowId: (expense) => expense._id,
                      },
                      actions: [
                        {
                          label: "Edit",
                          icon: "bi-pencil",
                          onClick: (expense) => handleEditExpense(expense),
                          variant: "secondary",
                        },
                        {
                          label: "Delete",
                          icon: "bi-trash",
                          onClick: (expense) =>
                            handleDeleteExpense(expense._id),
                          variant: "danger",
                        },
                      ],
                      bulkActions:
                        selectedExpenses.length > 0
                          ? [
                              {
                                label: "Delete Selected",
                                icon: "bi-trash",
                                onClick: () => handleBulkDelete(),
                                variant: "danger",
                                requiresSelection: true,
                              },
                            ]
                          : [],
                      pagination: {
                        page: pagination.page,
                        limit: pagination.limit,
                        total: pagination.total,
                        showSizeSelector: true,
                        sizeSelectorOptions: [10, 20, 50, 100],
                      },
                      onSort: (sort) => {
                        setFilters((prev) => ({
                          ...prev,
                          sortBy: sort.column,
                          sortOrder: sort.direction,
                        }));
                      },
                      onPageChange: (page) => {
                        setPagination((prev) => ({ ...prev, page }));
                      },
                      onPageSizeChange: (size) => {
                        setPagination((prev) => ({
                          ...prev,
                          limit: size,
                          page: 1,
                        }));
                      },
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Expense Dialog */}
      <Modal
        show={showAddExpenseDialog}
        onClose={handleCloseDialog}
        title={editingExpense ? "Edit Expense" : "Add New Expense"}
        loading={operationLoading}
        footer={
          <>
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
              form="expense-form"
              className="btn btn-primary"
              disabled={operationLoading}
            >
              {operationLoading ? (
                <>
                  <LoadingSpinner
                    config={{ size: "small", showText: false }}
                    className="me-2"
                  />
                  {editingExpense ? "Updating..." : "Adding..."}
                </>
              ) : editingExpense ? (
                "Update Expense"
              ) : (
                "Add Expense"
              )}
            </button>
          </>
        }
      >
        <form id="expense-form" onSubmit={handleAddExpense}>
          {submitError && (
            <div className="alert alert-danger" role="alert">
              {submitError}
            </div>
          )}
          <InputField
            label="Expense Name"
            type="text"
            value={newExpense.name}
            onChange={(value) => setNewExpense({ ...newExpense, name: value })}
            required
            id="expense-name"
          />
          <InputField
            label="Amount"
            type="number"
            step="0.01"
            value={newExpense.amount}
            onChange={(amount) => {
              const updates: any = {
                ...newExpense,
                amount,
              };
              
              // Only auto-split if split is enabled and user hasn't manually edited
              if (newExpense.isSplit && !manualSplitEdit && amount) {
                const halfAmount = (parseFloat(amount) / 2).toFixed(2);
                updates.saketAmount = halfAmount;
                updates.ayushAmount = halfAmount;
              }
              
              setNewExpense(updates);
            }}
            required
            id="expense-amount"
          />
          <SelectField
            label="Category"
            value={newExpense.category}
            onChange={(value) =>
              setNewExpense({
                ...newExpense,
                category: value,
                subcategory: "",
              })
            }
            options={[
              { label: "Select a category", value: "" },
              ...(Array.isArray(categories)
                ? categories.map((category) => ({
                    label: category.name,
                    value: category._id,
                  }))
                : []),
            ]}
            required
            placeholder="Select a category"
            id="expense-category"
          />
          <SelectField
            label="Sub-category (Optional)"
            value={newExpense.subcategory}
            onChange={(value) =>
              setNewExpense({
                ...newExpense,
                subcategory: value,
              })
            }
            options={[
              { label: "Select a sub-category", value: "" },
              ...(newExpense.category
                ? (() => {
                    const selectedCategory = categories.find(
                      (cat) => cat._id === newExpense.category
                    );
                    return (
                      selectedCategory?.subcategories?.map(
                        (subcategory: Subcategory) => ({
                          label: subcategory.name,
                          value: subcategory.name,
                        })
                      ) || []
                    );
                  })()
                : []),
            ]}
            disabled={!newExpense.category}
            placeholder="Select a sub-category"
            id="expense-subcategory"
          />
          <SelectField
            label="Paid By"
            value={newExpense.paidBy}
            onChange={(value) =>
              setNewExpense({ ...newExpense, paidBy: value })
            }
            options={[
              { label: "Select who paid", value: "" },
              ...users.map((user) => ({
                label: user.name,
                value: user.id,
              })),
            ]}
            required
            placeholder="Select who paid"
            id="expense-paidBy"
          />
          <CheckboxField
            label="Split this expense between users"
            checked={newExpense.isSplit}
            onChange={(isSplit) => {
              setNewExpense({
                ...newExpense,
                isSplit,
                splitBetween: isSplit ? ["saket", "ayush"] : [],
                saketAmount: isSplit
                  ? (parseFloat(newExpense.amount) / 2).toString()
                  : "",
                ayushAmount: isSplit
                  ? (parseFloat(newExpense.amount) / 2).toString()
                  : "",
              });
              // Reset manual edit flag when toggling split
              setManualSplitEdit(false);
            }}
            id="expense-split"
          />

          {newExpense.isSplit && (
            <FormGroup title="Split Details">
              <div className="row">
                <div className="col-md-6">
                  <InputField
                    label="Saket's Amount"
                    type="number"
                    step="0.01"
                    value={newExpense.saketAmount}
                    onChange={(saketAmount) => {
                      const totalAmount = parseFloat(newExpense.amount || "0");
                      const saketValue = parseFloat(saketAmount || "0");
                      const remainingAmount = totalAmount - saketValue;
                      
                      setNewExpense({
                        ...newExpense,
                        saketAmount,
                        ayushAmount: remainingAmount >= 0 ? remainingAmount.toFixed(2) : "0.00",
                      });
                      // Mark that user has manually edited split amounts
                      setManualSplitEdit(true);
                    }}
                    placeholder="0.00"
                    id="saket-amount"
                  />
                </div>
                <div className="col-md-6">
                  <InputField
                    label="Ayush's Amount"
                    type="number"
                    step="0.01"
                    value={newExpense.ayushAmount}
                    onChange={(ayushAmount) => {
                      const totalAmount = parseFloat(newExpense.amount || "0");
                      const ayushValue = parseFloat(ayushAmount || "0");
                      const remainingAmount = totalAmount - ayushValue;
                      
                      setNewExpense({
                        ...newExpense,
                        ayushAmount,
                        saketAmount: remainingAmount >= 0 ? remainingAmount.toFixed(2) : "0.00",
                      });
                      // Mark that user has manually edited split amounts
                      setManualSplitEdit(true);
                    }}
                    placeholder="0.00"
                    id="ayush-amount"
                  />
                </div>
              </div>
              <small className="text-muted">
                Total split: ₹
                {(
                  parseFloat(newExpense.saketAmount || "0") +
                  parseFloat(newExpense.ayushAmount || "0")
                ).toFixed(2)}
                {newExpense.amount &&
                  ` / ₹${parseFloat(newExpense.amount).toFixed(2)}`}
                {Math.abs(
                  parseFloat(newExpense.saketAmount || "0") +
                    parseFloat(newExpense.ayushAmount || "0") -
                    parseFloat(newExpense.amount || "0")
                ) > 0.01 && (
                  <span className="text-danger"> - Amounts don&apos;t match!</span>
                )}
              </small>
            </FormGroup>
          )}
          <DateField
            label="Date"
            value={newExpense.date}
            onChange={(value) => setNewExpense({ ...newExpense, date: value })}
            required
            id="expense-date"
          />
          <TextareaField
            label="Description (Optional)"
            rows={3}
            value={newExpense.description}
            onChange={(value) =>
              setNewExpense({
                ...newExpense,
                description: value,
              })
            }
            id="expense-description"
          />
        </form>
      </Modal>

      <ConfirmationDialog
        show={confirmation.show}
        title={confirmation.config?.title || ""}
        message={confirmation.config?.message || ""}
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
            backgroundColor: "rgba(0,0,0,0.1)",
            zIndex: 9999,
            backdropFilter: "blur(1px)",
          }}
        >
          <div className="processing-popup rounded p-3 shadow">
            <LoadingSpinner
              config={{
                size: "medium",
                text: "Processing...",
                showText: true,
                variant: "primary",
              }}
            />
          </div>
        </div>
      )}
    </MainLayout>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <ExpensesContent />
    </Suspense>
  );
}
