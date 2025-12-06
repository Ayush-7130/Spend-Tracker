"use client";

import { useState, useEffect, useCallback, Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { useOperationNotification } from "@/contexts/NotificationContext";
import { useCategories } from "@/contexts/CategoriesContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { debounce } from "@/lib/utils/performance";
import {
  Modal,
  FilterPanel,
  UserBadge,
  StatusBadge,
  LoadingSpinner,
  InputField,
  SelectField,
  DateField,
  CheckboxField,
  FormGroup,
  TextareaField,
  EmptyState,
  Badge,
  ExportButton,
} from "@/shared/components";
import { TableCard } from "@/shared/components/Card/TableCard";
import {
  formatCurrency,
  formatDate,
  fetchData,
  buildUrlWithParams,
  PaginationData,
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

  // Sort handlers - currently not used but kept for future implementation
  // const { handleSort, getSortIcon } = createSortHandler(sortConfig, (config) => {
  //   setFilters((prev) => ({
  //     ...prev,
  //     sortBy: config.sortBy,
  //     sortOrder: config.sortOrder,
  //   }));
  // });

  // Categories are now managed by CategoriesContext - no need to fetch here

  useEffect(() => {
    // Show success message if redirected from add expense
    if (searchParams.get("success") === "added") {
      setTimeout(() => {
        notifyAdded("Expense");
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]); // Only depend on searchParams

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

  // Debounced fetch for search to avoid excessive API calls
  const debouncedFetchExpenses = useMemo(
    () => debounce(fetchExpenses, 300),
    [fetchExpenses]
  );

  useEffect(() => {
    // Use debounced fetch for search queries, immediate fetch for other filters
    if (filters.search) {
      debouncedFetchExpenses();
    } else {
      fetchExpenses();
    }
  }, [fetchExpenses, debouncedFetchExpenses, filters.search]);

  const handleFilterChange = (key: string, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
    setPagination((prev) => ({ ...prev, page: 1 }));
  };

  // Selection handlers - currently not used but kept for future implementation
  // const handleSelectExpense = (expenseId: string) => {
  //   setSelectedExpenses((prev) =>
  //     prev.includes(expenseId)
  //       ? prev.filter((id) => id !== expenseId)
  //       : [...prev, expenseId]
  //   );
  // };

  // const handleSelectAll = () => {
  //   setSelectedExpenses(
  //     selectedExpenses.length === expenses.length
  //       ? []
  //       : expenses.map((exp) => exp._id)
  //   );
  // };

  // Bulk delete handler - commented out for future use
  // const handleBulkDelete = async () => {
  //   const result = await bulkDelete(
  //     selectedExpenses,
  //     "/api/expenses",
  //     "expenses"
  //   );
  //   if (result.success) {
  //     setSelectedExpenses([]);
  //     fetchExpenses();
  //     notifyDeleted(`${selectedExpenses.length} expense(s)`);
  //   } else if (result.error && result.error !== "Cancelled by user") {
  //     notifyError("Delete", result.error);
  //   }
  // };

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
          setOperationLoading(false);
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

      // Check if response is successful
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || `Failed to ${isEditing ? "update" : "add"} expense`
        );
      }

      // Close dialog and reset form
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

      // Refresh the expenses list
      await fetchExpenses();

      // Show success notification
      if (isEditing) {
        notifyUpdated("Expense");
      } else {
        notifyAdded("Expense");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Failed to ${editingExpense ? "update" : "add"} expense`;
      setSubmitError(errorMessage);
      notifyError(editingExpense ? "Update" : "Create", errorMessage);
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
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h5 className="mb-0">
                <i className="bi bi-table me-2"></i>
                Expense List
              </h5>
              <ExportButton
                endpoint="/api/expenses/export"
                params={filters}
                label="Export"
                variant="outline-secondary"
                icon="bi-download"
                size="sm"
              />
            </div>
            {loading ? (
              <div className="card">
                <div className="card-body text-center py-4">
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
              </div>
            ) : expenses.length === 0 ? (
              <div className="card">
                <div className="card-body">
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
                </div>
              </div>
            ) : (
              <>
                <TableCard<Expense>
                  data={expenses}
                  columns={[
                    {
                      key: "date",
                      label: "Date",
                      render: (expense: Expense) => (
                        <span style={{ color: "var(--text-secondary)" }}>
                          {formatDate(expense.date)}
                        </span>
                      ),
                    },
                    {
                      key: "description",
                      label: "Description",
                      render: (expense: Expense) => (
                        <div>
                          <strong>{expense.description}</strong>
                          {expense.subcategory && (
                            <small
                              className="d-block"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              {expense.subcategory}
                            </small>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "category",
                      label: "Category",
                      render: (expense: Expense) => (
                        <Badge variant="secondary">
                          {expense.categoryDetails?.[0]?.name ||
                            expense.category}
                        </Badge>
                      ),
                    },
                    {
                      key: "amount",
                      label: "Amount",
                      render: (expense: Expense) => (
                        <div>
                          <strong>{formatCurrency(expense.amount)}</strong>
                          {expense.isSplit && (
                            <small
                              className="d-block"
                              style={{ color: "var(--text-secondary)" }}
                            >
                              Split: S₹{expense.splitDetails?.saketAmount} / A₹
                              {expense.splitDetails?.ayushAmount}
                            </small>
                          )}
                        </div>
                      ),
                    },
                    {
                      key: "paidBy",
                      label: "Paid By",
                      render: (expense: Expense) => (
                        <UserBadge user={expense.paidBy as "saket" | "ayush"} />
                      ),
                    },
                    {
                      key: "split",
                      label: "Split",
                      render: (expense: Expense) => (
                        <StatusBadge
                          status={expense.isSplit ? "split" : "personal"}
                          type="split"
                        />
                      ),
                    },
                  ]}
                  actions={[
                    {
                      label: "",
                      icon: "bi-pencil",
                      onClick: (expense: Expense) => handleEditExpense(expense),
                      variant: "secondary",
                    },
                    {
                      label: "",
                      icon: "bi-trash",
                      onClick: (expense: Expense) =>
                        handleDeleteExpense(expense._id),
                      variant: "danger",
                    },
                  ]}
                  mobileCardRender={(expense: Expense) => ({
                    title: expense.description,
                    subtitle: formatDate(expense.date),
                    amount: formatCurrency(expense.amount),
                    meta:
                      expense.categoryDetails?.[0]?.name || expense.category,
                    badge: (
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <UserBadge user={expense.paidBy as "saket" | "ayush"} />
                        {expense.isSplit && (
                          <StatusBadge status="split" type="split" />
                        )}
                      </div>
                    ),
                    splitInfo: expense.isSplit ? (
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span>
                          <i className="bi bi-person-circle me-1"></i>
                          <strong>Saket:</strong> ₹
                          {expense.splitDetails?.saketAmount}
                        </span>
                        <span>
                          <i className="bi bi-person-circle me-1"></i>
                          <strong>Ayush:</strong> ₹
                          {expense.splitDetails?.ayushAmount}
                        </span>
                      </div>
                    ) : undefined,
                  })}
                  emptyMessage="No expenses found"
                  loading={loading}
                />

                {/* Pagination Controls */}
                {pagination.pages > 1 && (
                  <div className="pagination-controls d-flex justify-content-between align-items-center mt-3">
                    <div className="pagination-info text-muted">
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        pagination.total
                      )}{" "}
                      of {pagination.total} expenses
                    </div>
                    <div className="pagination-buttons d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page - 1,
                          }))
                        }
                        disabled={pagination.page === 1}
                      >
                        Previous
                      </button>
                      <span className="btn btn-sm btn-outline-secondary disabled">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <button
                        className="btn btn-sm btn-outline-secondary"
                        onClick={() =>
                          setPagination((prev) => ({
                            ...prev,
                            page: prev.page + 1,
                          }))
                        }
                        disabled={pagination.page === pagination.pages}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
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
                        ayushAmount:
                          remainingAmount >= 0
                            ? remainingAmount.toFixed(2)
                            : "0.00",
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
                        saketAmount:
                          remainingAmount >= 0
                            ? remainingAmount.toFixed(2)
                            : "0.00",
                      });
                      // Mark that user has manually edited split amounts
                      setManualSplitEdit(true);
                    }}
                    placeholder="0.00"
                    id="ayush-amount"
                  />
                </div>
              </div>
              <small style={{ color: "var(--text-secondary)" }}>
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
                  <span style={{ color: "var(--status-error)" }}>
                    {" "}
                    - Amounts don&apos;t match!
                  </span>
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
