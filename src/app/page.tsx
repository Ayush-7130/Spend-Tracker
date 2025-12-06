"use client";

import { useState, useEffect } from "react";
import MainLayout from "@/components/MainLayout";
import Link from "next/link";
import { useOperationNotification } from "@/contexts/NotificationContext";
import { useCategories } from "@/contexts/CategoriesContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import {
  StatsCard,
  LoadingSpinner,
  UserBadge,
  StatusBadge,
  Table,
  Modal,
  EmptyState,
  Badge,
  InputField,
  SelectField,
  TextareaField,
  DateField,
} from "@/shared/components";

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

interface SettlementData {
  balances: Array<{
    fromUser: string;
    toUser: string;
    amount: number;
    status: "owes" | "settled";
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
  const { categories } = useCategories(); // Use categories context
  const confirmation = useConfirmation();

  const [dashboardData, setDashboardData] = useState<DashboardData | null>(
    null
  );
  const [settlementData, setSettlementData] = useState<SettlementData | null>(
    null
  );
  const [recentSettlements, setRecentSettlements] = useState<Settlement[]>([]);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<"all" | "saket" | "ayush">(
    "all"
  );

  // Dialog states
  const [showAddExpenseDialog, setShowAddExpenseDialog] = useState(false);
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);

  // Form states
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

  const [newSettlement, setNewSettlement] = useState({
    from: "",
    to: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    status: "settled" as "borrow" | "settled",
  });

  useEffect(() => {
    fetchDashboardData(selectedUser);
    if (selectedUser === "all") {
      fetchSettlementData();
    }
  }, [selectedUser]);

  // Categories are now managed by CategoriesContext - no need to fetch here

  const fetchSettlementData = async () => {
    try {
      const [balanceResponse, settlementsResponse] = await Promise.all([
        fetch("/api/settlements/balance"),
        fetch("/api/settlements"),
      ]);

      if (balanceResponse.ok) {
        const balanceResult = await balanceResponse.json();
        setSettlementData(balanceResult);
      }

      if (settlementsResponse.ok) {
        const settlementsResult = await settlementsResponse.json();
        setRecentSettlements(settlementsResult.slice(0, 5)); // Get recent 5 settlements
      }
    } catch {}
  };

  useEffect(() => {
    fetchDashboardData(selectedUser);
    if (selectedUser === "all") {
      fetchSettlementData();
    }
  }, [selectedUser]);

  const fetchDashboardData = async (
    user: "all" | "saket" | "ayush" = "all"
  ) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/dashboard?user=${user}`);
      const result = await response.json();

      if (result.success) {
        setDashboardData(result.data);
        setError(null);
      } else {
        setError(result.error || "Failed to fetch dashboard data");
      }
    } catch {
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString("en-IN")}`;
  };

  const getUserDisplayName = () => {
    if (selectedUser === "all") return "All Users";
    return selectedUser.charAt(0).toUpperCase() + selectedUser.slice(1);
  };

  const getStatsTitle = (baseTitle: string) => {
    if (baseTitle.includes("This Month")) {
      const currentMonth = new Date().toLocaleDateString("en-IN", {
        month: "short",
      });
      const monthTitle = baseTitle.replace(
        "This Month",
        `${currentMonth} ${new Date().getFullYear()}`
      );
      if (selectedUser === "all") {
        return monthTitle.replace("My ", "Total ");
      }
      return monthTitle;
    }

    if (selectedUser === "all") {
      return baseTitle.replace("My ", "Total ");
    }
    return baseTitle;
  };

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
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
          setError(
            `Split amounts (₹${splitTotal.toFixed(2)}) must equal total amount (₹${totalAmount.toFixed(2)})`
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

      const response = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(expenseData),
      });

      if (response.ok) {
        setShowAddExpenseDialog(false);
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
        fetchDashboardData(selectedUser);
        if (selectedUser === "all") {
          fetchSettlementData();
        }
        notifyAdded("Expense");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to add expense");
      }
    } catch {
      setError("Failed to add expense");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleRecordSettlement = async (e: React.FormEvent) => {
    e.preventDefault();
    setOperationLoading(true);

    // Validation: Check if from and to users are the same
    if (newSettlement.from === newSettlement.to) {
      setError("From and To users cannot be the same person");
      setOperationLoading(false);
      return;
    }

    // Validation: Check if amount is valid
    const amount = parseFloat(newSettlement.amount);
    if (isNaN(amount) || amount <= 0) {
      setError("Please enter a valid amount greater than 0");
      setOperationLoading(false);
      return;
    }

    try {
      // Convert IDs to proper names
      const getUserName = (id: string) => {
        const user = dashboardData?.users?.find((u) => u.id === id);
        return user?.name || id;
      };

      const settlementData = {
        fromUser: getUserName(newSettlement.from),
        toUser: getUserName(newSettlement.to),
        amount: amount,
        date: newSettlement.date,
        description: newSettlement.description,
        status: newSettlement.status,
        expenseId: "000000000000000000000000", // Placeholder for now
      };

      const response = await fetch("/api/settlements", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settlementData),
      });

      if (response.ok) {
        setShowSettlementDialog(false);
        setNewSettlement({
          from: "",
          to: "",
          amount: "",
          date: new Date().toISOString().split("T")[0],
          description: "",
          status: "settled",
        });
        // Refresh dashboard and settlement data
        await fetchDashboardData(selectedUser);
        await fetchSettlementData();
        setError(null); // Clear any previous errors
        notifyAdded("Settlement");
      } else {
        const errorData = await response.json();
        setError(errorData.error || "Failed to record settlement");
      }
    } catch {
      setError("Error recording settlement");
    } finally {
      setOperationLoading(false);
    }
  };

  const handleQuickSettle = () => {
    if (!settlementData || settlementData.balances.length === 0) return;

    // Get the first outstanding balance
    const outstandingBalance = settlementData.balances.find(
      (b) => b.status === "owes"
    );
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
      date: new Date().toISOString().split("T")[0],
      description: `Settlement for outstanding balance`,
      status: "settled",
    });

    // Open the settlement dialog
    setShowSettlementDialog(true);
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container-fluid mt-4">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "400px" }}
          >
            <LoadingSpinner
              config={{
                size: "medium",
                text: "Loading dashboard data...",
                showText: true,
                variant: "primary",
                centered: true,
              }}
            />
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
        <EmptyState
          icon="💰"
          title="Welcome to Spend Tracker"
          description="Start tracking your expenses by adding your first expense below."
          size="large"
          actions={[
            {
              label: "Add First Expense",
              onClick: () => setShowAddExpenseDialog(true),
              variant: "primary",
              icon: "plus",
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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="bi bi-house-door me-2"></i>
              Dashboard
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
                <ul className="dropdown-menu py-2" style={{ zIndex: 1050 }}>
                  <li>
                    <button
                      className={`dropdown-item py-1 ${selectedUser === "all" ? "active" : ""}`}
                      onClick={() => setSelectedUser("all")}
                    >
                      <i className="bi bi-people me-2"></i>
                      All Users
                    </button>
                  </li>
                  <li>
                    <hr className="dropdown-divider" />
                  </li>
                  <li>
                    <button
                      className={`dropdown-item py-1 ${selectedUser === "saket" ? "active" : ""}`}
                      onClick={() => setSelectedUser("saket")}
                    >
                      <i className="bi bi-person me-2"></i>
                      Saket
                    </button>
                  </li>
                  <li>
                    <button
                      className={`dropdown-item py-1 ${selectedUser === "ayush" ? "active" : ""}`}
                      onClick={() => setSelectedUser("ayush")}
                    >
                      <i className="bi bi-person me-2"></i>
                      Ayush
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Quick Stats Cards */}
          <div className="row mb-4">
            <div className="col-md-4 mb-3">
              <StatsCard
                title={getStatsTitle("My Total Expenses")}
                value={formatCurrency(dashboardData.totalExpenses)}
                subtitle={`${dashboardData.totalExpenseCount} transactions`}
                icon="bi bi-currency-rupee"
                variant="primary"
                onClick={() => (window.location.href = "/expenses")}
              />
            </div>

            <div className="col-md-4 mb-3">
              <StatsCard
                title={getStatsTitle("My This Month")}
                value={formatCurrency(dashboardData.thisMonthTotal)}
                subtitle={`${dashboardData.thisMonthCount} expenses`}
                icon={getMonthIcon()}
                variant="success"
              />
            </div>

            <div className="col-md-4 mb-3">
              <StatsCard
                title="Categories"
                value={dashboardData.categoriesCount}
                subtitle="configured"
                icon="bi bi-tags"
                variant="warning"
                onClick={() => (window.location.href = "/categories")}
              />
            </div>
          </div>

          {/* Recent Expenses */}
          <div className="row mb-4">
            <div className="col-md-8 mb-3 mb-md-0">
              <div className="card h-100">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    {selectedUser === "all"
                      ? "Recent Expenses"
                      : "My Recent Expenses"}
                  </h5>
                  <Link
                    href="/expenses"
                    className="btn btn-sm btn-outline-primary"
                  >
                    View All
                  </Link>
                </div>
                <div className="card-body p-0">
                  {dashboardData.recentExpenses.length === 0 ? (
                    <EmptyState
                      icon="📋"
                      title="No expenses yet"
                      description="Add your first expense to get started tracking."
                      size="small"
                      actions={[
                        {
                          label: "Add Expense",
                          onClick: () => setShowAddExpenseDialog(true),
                          variant: "primary",
                          icon: "plus",
                        },
                      ]}
                      showBorder={false}
                    />
                  ) : (
                    <Table
                      config={{
                        columns: [
                          {
                            key: "date",
                            header: "Date",
                            accessor: "date",
                            render: (value) => formatDate(value),
                          },
                          {
                            key: "description",
                            header: "Description",
                            accessor: "description",
                          },
                          {
                            key: "category",
                            header: "Category",
                            render: (value, row) => (
                              <Badge variant="secondary">
                                {row.categoryName || row.category}
                              </Badge>
                            ),
                          },
                          {
                            key: "amount",
                            header: "Amount",
                            accessor: "amount",
                            render: (value) => formatCurrency(value),
                          },
                          {
                            key: "paidBy",
                            header: selectedUser === "all" ? "Paid By" : "Type",
                            render: (value, row) =>
                              selectedUser === "all" ? (
                                <UserBadge
                                  user={row.paidBy as "saket" | "ayush"}
                                />
                              ) : (
                                <StatusBadge
                                  status={row.isSplit ? "split" : "personal"}
                                  type="split"
                                />
                              ),
                          },
                        ],
                        data: dashboardData.recentExpenses,
                        keyExtractor: (expense) => expense._id,
                        responsive: true,
                        size: "small",
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div className="col-md-4">
              <div className="card h-100">
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
                    {selectedUser === "all" && (
                      <>
                        <button
                          className="btn btn-success"
                          onClick={() => setShowSettlementDialog(true)}
                        >
                          <i className="bi bi-currency-exchange me-2"></i>
                          Record Settlement
                        </button>
                        {settlementData &&
                          settlementData.balances.length > 0 && (
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
                    <Link
                      href="/categories"
                      className="btn btn-outline-secondary"
                    >
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
          {selectedUser === "all" && settlementData && (
            <div className="row mb-4">
              <div className="col-md-8 mb-3 mb-md-0">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      <i className="bi bi-currency-exchange me-2"></i>
                      Settlement Status
                    </h6>
                    <Link
                      href="/settlements"
                      className="btn btn-sm btn-outline-primary"
                    >
                      View All
                    </Link>
                  </div>
                  <div className="card-body p-0">
                    {settlementData.balances.length > 0 ? (
                      <Table
                        config={{
                          columns: [
                            {
                              key: "fromUser",
                              header: "From",
                              accessor: "fromUser",
                              render: (value) => (
                                <UserBadge
                                  user={
                                    value.toLowerCase() as "saket" | "ayush"
                                  }
                                  variant="avatar"
                                />
                              ),
                            },
                            {
                              key: "toUser",
                              header: "To",
                              accessor: "toUser",
                              render: (value) => (
                                <UserBadge
                                  user={
                                    value.toLowerCase() as "saket" | "ayush"
                                  }
                                  variant="avatar"
                                />
                              ),
                            },
                            {
                              key: "amount",
                              header: "Amount",
                              accessor: "amount",
                              render: (value) => (
                                <small
                                  className="fw-bold"
                                  style={{ color: "var(--status-error)" }}
                                >
                                  ₹{value}
                                </small>
                              ),
                            },
                            {
                              key: "status",
                              header: "Status",
                              render: () => (
                                <StatusBadge
                                  status="owes"
                                  type="settlement"
                                  variant="small"
                                />
                              ),
                            },
                          ],
                          data: settlementData.balances
                            .filter((balance) => balance.status === "owes")
                            .slice(0, 3),
                          keyExtractor: (balance) =>
                            `${balance.fromUser}-${balance.toUser}`,
                          responsive: true,
                          size: "small",
                        }}
                      />
                    ) : (
                      <EmptyState
                        icon="✅"
                        title="All Settled Up!"
                        description="No outstanding balances between users."
                        size="small"
                        variant="default"
                        showBorder={false}
                      />
                    )}
                  </div>
                </div>
              </div>

              <div className="col-md-4">
                <div className="card h-100">
                  <div className="card-header">
                    <h6 className="mb-0">Settlement Summary</h6>
                  </div>
                  <div className="card-body">
                    <div className="d-flex justify-content-between mb-2">
                      <small>Outstanding:</small>
                      <small
                        className="fw-bold"
                        style={{ color: "var(--status-error)" }}
                      >
                        ₹{settlementData.summary.totalOwed}
                      </small>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <small>Settled:</small>
                      <small
                        className="fw-bold"
                        style={{ color: "var(--status-success)" }}
                      >
                        ₹{settlementData.summary.totalSettled}
                      </small>
                    </div>
                    <div className="d-flex justify-content-between mb-2">
                      <small>Transactions:</small>
                      <small className="fw-bold">
                        {settlementData.summary.totalTransactions}
                      </small>
                    </div>
                    <div className="d-flex justify-content-between mb-3">
                      <small>Active:</small>
                      <small
                        className="fw-bold"
                        style={{ color: "var(--status-warning)" }}
                      >
                        {settlementData.summary.activeBalances}
                      </small>
                    </div>
                    <div className="d-grid">
                      <Link
                        href="/settlements"
                        className="btn btn-primary btn-sm"
                      >
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
          {selectedUser === "all" && (
            <div className="row mb-4">
              <div className="col-12">
                <div className="card h-100">
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">
                      <i className="bi bi-clock-history me-2"></i>
                      Recent Settlements
                    </h6>
                    <Link
                      href="/settlements"
                      className="btn btn-sm btn-outline-primary"
                    >
                      View All Settlements
                    </Link>
                  </div>
                  <div className="card-body p-0">
                    {recentSettlements.length === 0 ? (
                      <EmptyState
                        icon="💼"
                        title="No settlements yet"
                        description="Record your first settlement to track balance history."
                        size="small"
                        actions={[
                          {
                            label: "Record Settlement",
                            onClick: () => setShowSettlementDialog(true),
                            variant: "primary",
                            icon: "plus",
                          },
                        ]}
                        showBorder={false}
                      />
                    ) : (
                      <Table
                        config={{
                          columns: [
                            {
                              key: "date",
                              header: "Date",
                              accessor: "date",
                              render: (value) => (
                                <small>{formatDate(value)}</small>
                              ),
                            },
                            {
                              key: "fromUser",
                              header: "From",
                              accessor: "fromUser",
                              render: (value) => (
                                <div className="d-flex align-items-center">
                                  <div className="avatar-xs bg-success text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                    {value.charAt(0)}
                                  </div>
                                  <small>{value}</small>
                                </div>
                              ),
                            },
                            {
                              key: "toUser",
                              header: "To",
                              accessor: "toUser",
                              render: (value) => (
                                <div className="d-flex align-items-center">
                                  <div className="avatar-xs bg-primary text-white rounded-circle me-2 d-flex align-items-center justify-content-center">
                                    {value.charAt(0)}
                                  </div>
                                  <small>{value}</small>
                                </div>
                              ),
                            },
                            {
                              key: "amount",
                              header: "Amount",
                              accessor: "amount",
                              render: (value) => (
                                <small
                                  className="fw-bold"
                                  style={{ color: "var(--status-success)" }}
                                >
                                  ₹{value}
                                </small>
                              ),
                            },
                            {
                              key: "description",
                              header: "Description",
                              accessor: "description",
                              render: (value) => (
                                <small
                                  style={{ color: "var(--text-secondary)" }}
                                >
                                  {value || "Settlement payment"}
                                </small>
                              ),
                            },
                          ],
                          data: recentSettlements,
                          keyExtractor: (settlement) => settlement._id,
                          responsive: true,
                          size: "small",
                        }}
                      />
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
      <Modal
        show={showAddExpenseDialog}
        onClose={() => setShowAddExpenseDialog(false)}
        title="Add New Expense"
        size="md"
        footer={
          <>
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
              form="add-expense-form"
              disabled={operationLoading}
            >
              {operationLoading ? (
                <>
                  <LoadingSpinner
                    config={{ size: "small", showText: false }}
                    className="me-2"
                  />
                  Adding...
                </>
              ) : (
                "Add Expense"
              )}
            </button>
          </>
        }
      >
        <form id="add-expense-form" onSubmit={handleAddExpense}>
          <div className="modal-body">
            <InputField
              label="Expense Name"
              type="text"
              id="expense-name"
              value={newExpense.name}
              onChange={(value) =>
                setNewExpense({ ...newExpense, name: value as string })
              }
              required
              placeholder="Enter expense name"
            />
            <InputField
              label="Amount"
              type="number"
              id="expense-amount"
              value={newExpense.amount}
              onChange={(value) => {
                const amount = value as string;
                const splitAmount = parseFloat(amount) / 2;
                setNewExpense({
                  ...newExpense,
                  amount,
                  // Auto-update split amounts if split is enabled
                  saketAmount: newExpense.isSplit
                    ? splitAmount.toString()
                    : newExpense.saketAmount,
                  ayushAmount: newExpense.isSplit
                    ? splitAmount.toString()
                    : newExpense.ayushAmount,
                });
              }}
              required
              placeholder="0.00"
              step="0.01"
            />
            <SelectField
              label="Category"
              id="expense-category"
              value={newExpense.category}
              onChange={(value) =>
                setNewExpense({
                  ...newExpense,
                  category: value as string,
                  subcategory: "",
                })
              }
              required
              options={[
                { label: "Select a category", value: "" },
                ...(Array.isArray(categories)
                  ? categories.map((category) => ({
                      label: category.name,
                      value: category._id,
                    }))
                  : []),
              ]}
            />
            <SelectField
              label="Sub-category (Optional)"
              id="expense-subcategory"
              value={newExpense.subcategory}
              onChange={(value) =>
                setNewExpense({ ...newExpense, subcategory: value as string })
              }
              disabled={!newExpense.category}
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
            />
            <div className="mb-3">
              <label htmlFor="expense-paidBy" className="form-label">
                Paid By
              </label>
              <select
                className="form-select"
                id="expense-paidBy"
                value={newExpense.paidBy}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, paidBy: e.target.value })
                }
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
                      splitBetween: isSplit ? ["saket", "ayush"] : [],
                      saketAmount: isSplit
                        ? (parseFloat(newExpense.amount) / 2).toString()
                        : "",
                      ayushAmount: isSplit
                        ? (parseFloat(newExpense.amount) / 2).toString()
                        : "",
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
                    <label htmlFor="saket-amount" className="form-label">
                      Saket&apos;s Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      id="saket-amount"
                      value={newExpense.saketAmount}
                      onChange={(e) => {
                        const saketAmount = e.target.value;
                        const totalAmount = parseFloat(
                          newExpense.amount || "0"
                        );
                        const ayushAmount =
                          totalAmount - parseFloat(saketAmount || "0");
                        setNewExpense({
                          ...newExpense,
                          saketAmount,
                          ayushAmount:
                            ayushAmount >= 0 ? ayushAmount.toFixed(2) : "0",
                        });
                      }}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="col-md-6">
                    <label htmlFor="ayush-amount" className="form-label">
                      Ayush&apos;s Amount
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control"
                      id="ayush-amount"
                      value={newExpense.ayushAmount}
                      onChange={(e) => {
                        const ayushAmount = e.target.value;
                        const totalAmount = parseFloat(
                          newExpense.amount || "0"
                        );
                        const saketAmount =
                          totalAmount - parseFloat(ayushAmount || "0");
                        setNewExpense({
                          ...newExpense,
                          ayushAmount,
                          saketAmount:
                            saketAmount >= 0 ? saketAmount.toFixed(2) : "0",
                        });
                      }}
                      placeholder="0.00"
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
              </div>
            )}
            <div className="mb-3">
              <label htmlFor="expense-date" className="form-label">
                Date
              </label>
              <input
                type="date"
                className="form-control"
                id="expense-date"
                value={newExpense.date}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, date: e.target.value })
                }
                required
              />
            </div>
            <div className="mb-3">
              <label htmlFor="expense-description" className="form-label">
                Description (Optional)
              </label>
              <textarea
                className="form-control"
                id="expense-description"
                rows={3}
                value={newExpense.description}
                onChange={(e) =>
                  setNewExpense({ ...newExpense, description: e.target.value })
                }
              ></textarea>
            </div>
          </div>
        </form>
      </Modal>

      {/* Settlement Dialog */}
      <Modal
        show={showSettlementDialog}
        onClose={() => setShowSettlementDialog(false)}
        title="Record Settlement"
        size="md"
        footer={
          <>
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
              form="settlement-form"
              disabled={operationLoading}
            >
              {operationLoading ? (
                <>
                  <LoadingSpinner
                    config={{ size: "small", showText: false }}
                    className="me-2"
                  />
                  Recording...
                </>
              ) : (
                "Record Settlement"
              )}
            </button>
          </>
        }
      >
        <form id="settlement-form" onSubmit={handleRecordSettlement}>
          <SelectField
            label="From"
            id="settlement-from"
            value={newSettlement.from}
            onChange={(value) => {
              const newFrom = value as string;
              setNewSettlement({
                ...newSettlement,
                from: newFrom,
                // Clear "to" if it's the same as the new "from"
                to: newSettlement.to === newFrom ? "" : newSettlement.to,
              });
            }}
            required
            options={[
              { label: "Select who is paying", value: "" },
              ...(dashboardData?.users?.map((user) => ({
                label: user.name,
                value: user.id,
              })) || []),
            ]}
          />
          <SelectField
            label="To"
            id="settlement-to"
            value={newSettlement.to}
            onChange={(value) =>
              setNewSettlement({ ...newSettlement, to: value as string })
            }
            required
            options={[
              { label: "Select who is receiving", value: "" },
              ...(dashboardData?.users?.map((user) => ({
                label: user.name,
                value: user.id,
                disabled: user.id === newSettlement.from,
              })) || []),
            ]}
          />
          <InputField
            label="Amount"
            type="number"
            id="settlement-amount"
            value={newSettlement.amount}
            onChange={(value) =>
              setNewSettlement({ ...newSettlement, amount: value as string })
            }
            required
            placeholder="0.00"
            step="0.01"
          />
          <SelectField
            label="Status"
            id="settlement-status"
            value={newSettlement.status}
            onChange={(value) =>
              setNewSettlement({
                ...newSettlement,
                status: value as "borrow" | "settled",
              })
            }
            required
            options={[
              { label: "Borrow", value: "borrow" },
              { label: "Settled", value: "settled" },
            ]}
          />
          <DateField
            label="Date"
            id="settlement-date"
            value={newSettlement.date}
            onChange={(value) =>
              setNewSettlement({ ...newSettlement, date: value as string })
            }
            required
          />
          <TextareaField
            label="Description (Optional)"
            id="settlement-description"
            value={newSettlement.description}
            onChange={(value) =>
              setNewSettlement({
                ...newSettlement,
                description: value as string,
              })
            }
            rows={3}
            placeholder="Optional settlement notes"
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
            <div className="d-flex align-items-center">
              <LoadingSpinner
                config={{ size: "small", showText: false }}
                className="me-2"
              />
              <span>Processing...</span>
            </div>
          </div>
        </div>
      )}
    </MainLayout>
  );
}
