"use client";

import React, { useState, useEffect, useCallback } from "react";
import MainLayout from "@/components/MainLayout";
import { useOperationNotification } from "@/contexts/NotificationContext";
import ConfirmationDialog from "@/components/ConfirmationDialog";
import { useConfirmation } from "@/hooks/useConfirmation";
import { formatDate } from "@/lib/utils";
import {
  Modal,
  FilterPanel,
  StatusBadge,
  LoadingSpinner,
  EmptyState,
  SelectField,
  InputField,
  DateField,
  TextareaField,
  ExportButton,
} from "@/shared/components";
import { TableCard } from "@/shared/components/Card/TableCard";

interface Settlement {
  _id: string;
  expenseId: string;
  fromUser: string;
  toUser: string;
  amount: number;
  description: string;
  date: string;
  status: "borrow" | "settled";
}

interface Balance {
  fromUser: string;
  toUser: string;
  amount: number;
  status: "owes" | "settled";
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
  const { notifyError, notifyDeleted, notifyAdded } =
    useOperationNotification();
  const confirmation = useConfirmation();

  const [settlements, setSettlements] = useState<Settlement[]>([]);
  const [filteredSettlements, setFilteredSettlements] = useState<Settlement[]>(
    []
  );
  const [balances, setBalances] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [operationLoading, setOperationLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    search: "",
    fromUser: "",
    toUser: "",
    status: "",
    startDate: "",
    endDate: "",
    sortBy: "date",
    sortOrder: "desc",
  });

  // Record Settlement Dialog states
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [editingSettlement, setEditingSettlement] = useState<Settlement | null>(
    null
  );
  const [newSettlement, setNewSettlement] = useState({
    from: "",
    to: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
    status: "settled" as "borrow" | "settled",
  });
  const [submitError, setSubmitError] = useState<string | null>(null);

  const users = [
    { id: "saket", name: "Saket" },
    { id: "ayush", name: "Ayush" },
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const applyFilters = useCallback(() => {
    let filtered = [...settlements];

    // Search filter
    if (filters.search) {
      filtered = filtered.filter(
        (settlement) =>
          settlement.description
            ?.toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          settlement.fromUser
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          settlement.toUser.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // From user filter
    if (filters.fromUser) {
      filtered = filtered.filter(
        (settlement) =>
          settlement.fromUser.toLowerCase() === filters.fromUser.toLowerCase()
      );
    }

    // To user filter
    if (filters.toUser) {
      filtered = filtered.filter(
        (settlement) =>
          settlement.toUser.toLowerCase() === filters.toUser.toLowerCase()
      );
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter(
        (settlement) =>
          settlement.status?.toLowerCase() === filters.status.toLowerCase()
      );
    }

    // Date range filters
    if (filters.startDate) {
      filtered = filtered.filter(
        (settlement) => new Date(settlement.date) >= new Date(filters.startDate)
      );
    }

    if (filters.endDate) {
      filtered = filtered.filter(
        (settlement) => new Date(settlement.date) <= new Date(filters.endDate)
      );
    }

    // Sort
    filtered.sort((a, b) => {
      let aValue: string | number | Date, bValue: string | number | Date;

      switch (filters.sortBy) {
        case "date":
          aValue = new Date(a.date);
          bValue = new Date(b.date);
          break;
        case "amount":
          aValue = a.amount;
          bValue = b.amount;
          break;
        case "fromUser":
          aValue = a.fromUser.toLowerCase();
          bValue = b.fromUser.toLowerCase();
          break;
        case "toUser":
          aValue = a.toUser.toLowerCase();
          bValue = b.toUser.toLowerCase();
          break;
        default:
          aValue = a.date;
          bValue = b.date;
      }

      if (filters.sortOrder === "asc") {
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
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const handleSort = (column: string) => {
    const newOrder =
      filters.sortBy === column && filters.sortOrder === "desc"
        ? "asc"
        : "desc";
    setFilters((prev) => ({ ...prev, sortBy: column, sortOrder: newOrder }));
  };

  // Sort icon helper - currently not used but kept for future implementation
  const _getSortIcon = (column: string) => {
    if (filters.sortBy !== column) return "bi-arrow-down-up";
    return filters.sortOrder === "asc" ? "bi-arrow-up" : "bi-arrow-down";
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [settlementsRes, balancesRes] = await Promise.all([
        fetch("/api/settlements"),
        fetch("/api/settlements/balance"),
      ]);

      if (!settlementsRes.ok || !balancesRes.ok) {
        throw new Error("Failed to fetch data");
      }

      const settlementsData = await settlementsRes.json();
      const balancesData = await balancesRes.json();

      setSettlements(settlementsData);
      setBalances(balancesData);
    } catch (error) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Optimized refresh for partial updates after CRUD operations
  const refreshSettlements = async () => {
    try {
      const [settlementsRes, balancesRes] = await Promise.all([
        fetch("/api/settlements"),
        fetch("/api/settlements/balance"),
      ]);

      if (!settlementsRes.ok || !balancesRes.ok) {
        throw new Error("Failed to fetch updated data");
      }

      const settlementsData = await settlementsRes.json();
      const balancesData = await balancesRes.json();

      // Update state without loading indicators for smoother UX
      setSettlements(settlementsData);
      setBalances(balancesData);
    } catch (error) {
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
      setSubmitError("From and To users cannot be the same person");
      setOperationLoading(false);
      return;
    }

    // Validation: Check if amount is valid
    const amount = parseFloat(newSettlement.amount);
    if (isNaN(amount) || amount <= 0) {
      setSubmitError("Please enter a valid amount greater than 0");
      setOperationLoading(false);
      return;
    }

    try {
      // Convert IDs to proper names
      const getUserName = (id: string) => {
        const user = users.find((u) => u.id === id);
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

      const url = editingSettlement
        ? `/api/settlements/${editingSettlement._id}`
        : "/api/settlements";
      const method = editingSettlement ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settlementData),
      });

      // Check if response is successful
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error ||
            `Failed to ${editingSettlement ? "update" : "record"} settlement`
        );
      }

      // Close dialog and reset form
      setShowSettlementDialog(false);
      setEditingSettlement(null);
      setNewSettlement({
        from: "",
        to: "",
        amount: "",
        date: new Date().toISOString().split("T")[0],
        description: "",
        status: "settled",
      });
      setSubmitError(null);

      // Refresh data with optimized approach
      await refreshSettlements();

      // Show success notification
      if (editingSettlement) {
        notifyAdded("Settlement updated");
      } else {
        notifyAdded("Settlement");
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : `Error ${editingSettlement ? "updating" : "recording"} settlement`;
      setSubmitError(errorMessage);
      notifyError(editingSettlement ? "Update" : "Create", errorMessage);
    } finally {
      setOperationLoading(false);
    }
  };

  const handleEditSettlement = (settlement: Settlement) => {
    // Find user IDs from names
    const getUserId = (name: string) => {
      const user = users.find(
        (u) => u.name.toLowerCase() === name.toLowerCase()
      );
      return user?.id || name.toLowerCase();
    };

    setEditingSettlement(settlement);
    setNewSettlement({
      from: getUserId(settlement.fromUser),
      to: getUserId(settlement.toUser),
      amount: settlement.amount.toString(),
      date: new Date(settlement.date).toISOString().split("T")[0],
      description: settlement.description || "",
      status: settlement.status || "settled",
    });
    setShowSettlementDialog(true);
  };

  const handleCloseDialog = () => {
    setShowSettlementDialog(false);
    setEditingSettlement(null);
    setNewSettlement({
      from: "",
      to: "",
      amount: "",
      date: new Date().toISOString().split("T")[0],
      description: "",
      status: "settled",
    });
    setSubmitError(null);
  };

  const handleDeleteSettlement = async (settlementId: string) => {
    const confirmed = await confirmation.confirm({
      title: "Delete Settlement",
      message:
        "Are you sure you want to delete this settlement? This action cannot be undone.",
      confirmText: "Delete",
      type: "danger",
    });

    if (!confirmed) return;

    setOperationLoading(true);

    try {
      const response = await fetch(`/api/settlements/${settlementId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Refresh data with optimized approach
        await refreshSettlements();
        notifyDeleted("Settlement");
      } else {
        const errorData = await response.json();
        notifyError("Delete", errorData.error || "Failed to delete settlement");
      }
    } catch (error) {
      notifyError("Delete", "Failed to delete settlement");
    } finally {
      setOperationLoading(false);
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="container-fluid mt-4">
          <div
            className="d-flex justify-content-center align-items-center"
            style={{ minHeight: "400px" }}
          >
            <div className="text-center">
              <LoadingSpinner
                config={{
                  size: "medium",
                  text: "Loading settlement data and balances...",
                  showText: true,
                  variant: "primary",
                  centered: true,
                }}
              />
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
              <button
                onClick={() => setShowSettlementDialog(true)}
                className="btn btn-primary"
              >
                <i className="bi bi-plus-circle me-2"></i>
                Record Settlement
              </button>
            </div>

            {error && (
              <div
                className="alert alert-danger alert-dismissible"
                role="alert"
              >
                <i className="bi bi-exclamation-triangle me-2"></i>
                {error}
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setError(null)}
                ></button>
              </div>
            )}

            {/* Summary Statistics */}
            {balances && (
              <div className="row mb-3">
                <div className="col-md-3">
                  <div className="card border-danger">
                    <div className="card-body py-2 px-3 text-center">
                      <div className="d-flex align-items-center justify-content-center">
                        <i
                          className="bi bi-exclamation-triangle fs-5 me-2"
                          style={{ color: "var(--status-error)" }}
                        ></i>
                        <div>
                          <h5
                            className="mb-0"
                            style={{ color: "var(--status-error)" }}
                          >
                            ₹{balances.summary.totalOwed}
                          </h5>
                          <small style={{ color: "var(--text-secondary)" }}>
                            Outstanding
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-success">
                    <div className="card-body py-2 px-3 text-center">
                      <div className="d-flex align-items-center justify-content-center">
                        <i
                          className="bi bi-check-circle fs-5 me-2"
                          style={{ color: "var(--status-success)" }}
                        ></i>
                        <div>
                          <h5
                            className="mb-0"
                            style={{ color: "var(--status-success)" }}
                          >
                            ₹{balances.summary.totalSettled}
                          </h5>
                          <small style={{ color: "var(--text-secondary)" }}>
                            Settled
                          </small>
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
                          <h5 className="mb-0 text-primary">
                            {balances.summary.totalTransactions}
                          </h5>
                          <small style={{ color: "var(--text-secondary)" }}>
                            Transactions
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-md-3">
                  <div className="card border-warning">
                    <div className="card-body py-2 px-3 text-center">
                      <div className="d-flex align-items-center justify-content-center">
                        <i
                          className="bi bi-hourglass-split fs-5 me-2"
                          style={{ color: "var(--status-warning)" }}
                        ></i>
                        <div>
                          <h5
                            className="mb-0"
                            style={{ color: "var(--status-warning)" }}
                          >
                            {balances.summary.activeBalances}
                          </h5>
                          <small style={{ color: "var(--text-secondary)" }}>
                            Active
                          </small>
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
                  <TableCard<Balance>
                    data={balances.balances.filter(
                      (balance) => balance.status === "owes"
                    )}
                    columns={[
                      {
                        key: "fromUser",
                        label: "From",
                        render: (balance: Balance) => (
                          <div className="d-flex align-items-center">
                            <div
                              className="avatar-xs bg-danger text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                              style={{
                                width: "24px",
                                height: "24px",
                                fontSize: "10px",
                              }}
                            >
                              {balance.fromUser.charAt(0).toUpperCase()}
                            </div>
                            <span>
                              {balance.fromUser.charAt(0).toUpperCase() +
                                balance.fromUser.slice(1).toLowerCase()}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "toUser",
                        label: "To",
                        render: (balance: Balance) => (
                          <div className="d-flex align-items-center">
                            <div
                              className="avatar-xs bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                              style={{
                                width: "24px",
                                height: "24px",
                                fontSize: "10px",
                              }}
                            >
                              {balance.toUser.charAt(0).toUpperCase()}
                            </div>
                            <span>
                              {balance.toUser.charAt(0).toUpperCase() +
                                balance.toUser.slice(1).toLowerCase()}
                            </span>
                          </div>
                        ),
                      },
                      {
                        key: "amount",
                        label: "Amount",
                        render: (balance: Balance) => (
                          <span
                            className="fw-bold"
                            style={{ color: "var(--status-error)" }}
                          >
                            ₹{balance.amount}
                          </span>
                        ),
                      },
                    ]}
                    mobileCardRender={(balance: Balance) => ({
                      title: `${balance.fromUser
                        .charAt(0)
                        .toUpperCase()}${balance.fromUser
                        .slice(1)
                        .toLowerCase()} owes ${balance.toUser
                        .charAt(0)
                        .toUpperCase()}${balance.toUser
                        .slice(1)
                        .toLowerCase()}`,
                      amount: `₹${balance.amount}`,
                    })}
                    emptyMessage="All settled up!"
                  />
                </div>
              </div>
            )}

            {balances && balances.balances.length === 0 && (
              <div className="card mb-3">
                <div className="card-body text-center py-5">
                  <i
                    className="bi bi-check-circle-fill display-1"
                    style={{ color: "var(--status-success)" }}
                  ></i>
                  <h4
                    className="mt-3"
                    style={{ color: "var(--status-success)" }}
                  >
                    All Settled Up!
                  </h4>
                  <p style={{ color: "var(--text-secondary)" }}>
                    No outstanding balances between users
                  </p>
                </div>
              </div>
            )}

            {/* Filters */}
            <FilterPanel
              filters={[
                {
                  key: "search",
                  type: "text",
                  label: "Search",
                  placeholder: "Search settlements...",
                  colSize: 2.5,
                },
                {
                  key: "fromUser",
                  type: "select",
                  label: "From User",
                  options: [
                    { label: "All From Users", value: "" },
                    { label: "Saket", value: "Saket" },
                    { label: "Ayush", value: "Ayush" },
                  ],
                  colSize: 1.5,
                },
                {
                  key: "toUser",
                  type: "select",
                  label: "To User",
                  options: [
                    { label: "All To Users", value: "" },
                    { label: "Saket", value: "Saket" },
                    { label: "Ayush", value: "Ayush" },
                  ],
                  colSize: 1.5,
                },
                {
                  key: "status",
                  type: "select",
                  label: "Status",
                  options: [
                    { label: "All Status", value: "" },
                    { label: "Borrow", value: "borrow" },
                    { label: "Settled", value: "settled" },
                  ],
                  colSize: 1.5,
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
                  fromUser: "",
                  toUser: "",
                  status: "",
                  startDate: "",
                  endDate: "",
                  sortBy: "date",
                  sortOrder: "desc",
                });
              }}
            />

            {/* Full Settlement Table */}
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-table me-2"></i>
                  All Settlements
                </h5>
                <ExportButton
                  endpoint="/api/settlements/export"
                  params={filters}
                  label="Export"
                  variant="outline-secondary"
                  icon="bi-download"
                  size="sm"
                />
              </div>
              <div
                className="card-body"
                style={{ overflowX: "auto", overflowY: "visible" }}
              >
                <TableCard<Settlement>
                  data={filteredSettlements}
                  columns={[
                    {
                      key: "date",
                      label: "Date",
                      render: (settlement: Settlement) => (
                        <span style={{ color: "var(--text-secondary)" }}>
                          {formatDate(settlement.date)}
                        </span>
                      ),
                    },
                    {
                      key: "fromUser",
                      label: "From",
                      render: (settlement: Settlement) => (
                        <div className="d-flex align-items-center">
                          <div
                            className="avatar-xs bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                            style={{
                              width: "24px",
                              height: "24px",
                              fontSize: "10px",
                            }}
                          >
                            {settlement.fromUser.charAt(0).toUpperCase()}
                          </div>
                          <span>
                            {settlement.fromUser.charAt(0).toUpperCase() +
                              settlement.fromUser.slice(1).toLowerCase()}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: "toUser",
                      label: "To",
                      render: (settlement: Settlement) => (
                        <div className="d-flex align-items-center">
                          <div
                            className="avatar-xs bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                            style={{
                              width: "24px",
                              height: "24px",
                              fontSize: "10px",
                            }}
                          >
                            {settlement.toUser.charAt(0).toUpperCase()}
                          </div>
                          <span>
                            {settlement.toUser.charAt(0).toUpperCase() +
                              settlement.toUser.slice(1).toLowerCase()}
                          </span>
                        </div>
                      ),
                    },
                    {
                      key: "amount",
                      label: "Amount",
                      render: (settlement: Settlement) => (
                        <span
                          className="fw-bold"
                          style={{ color: "var(--status-success)" }}
                        >
                          ₹{settlement.amount}
                        </span>
                      ),
                    },
                    {
                      key: "description",
                      label: "Description",
                      render: (settlement: Settlement) => (
                        <span style={{ color: "var(--text-secondary)" }}>
                          {settlement.description || "Settlement payment"}
                        </span>
                      ),
                    },
                    {
                      key: "status",
                      label: "Status",
                      render: (settlement: Settlement) => (
                        <StatusBadge
                          status={settlement.status || "settled"}
                          type="settlement"
                        />
                      ),
                    },
                  ]}
                  actions={[
                    {
                      label: "",
                      icon: "bi-pencil",
                      onClick: (settlement: Settlement) =>
                        handleEditSettlement(settlement),
                      variant: "secondary",
                    },
                    {
                      label: "",
                      icon: "bi-trash",
                      onClick: (settlement: Settlement) =>
                        handleDeleteSettlement(settlement._id),
                      variant: "danger",
                    },
                  ]}
                  mobileCardRender={(settlement: Settlement) => ({
                    title: `${settlement.fromUser
                      .charAt(0)
                      .toUpperCase()}${settlement.fromUser
                      .slice(1)
                      .toLowerCase()} → ${settlement.toUser
                      .charAt(0)
                      .toUpperCase()}${settlement.toUser
                      .slice(1)
                      .toLowerCase()}`,
                    subtitle: formatDate(settlement.date),
                    amount: `₹${settlement.amount}`,
                    meta: settlement.description || "Settlement payment",
                    badge: (
                      <StatusBadge
                        status={settlement.status || "settled"}
                        type="settlement"
                      />
                    ),
                  })}
                  emptyMessage="No settlements found"
                  emptyAction={{
                    label: "Record Settlement",
                    onClick: () => setShowSettlementDialog(true),
                  }}
                  loading={loading}
                />

                {/* Pagination Controls */}
                {filteredSettlements.length > 0 && pagination.pages > 1 && (
                  <div className="pagination-controls d-flex justify-content-between align-items-center mt-3">
                    <div
                      className="pagination-info"
                      style={{ color: "var(--text-secondary)" }}
                    >
                      Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                      {Math.min(
                        pagination.page * pagination.limit,
                        filteredSettlements.length
                      )}{" "}
                      of {filteredSettlements.length} settlements
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
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1) !important;
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
        <Modal
          show={showSettlementDialog}
          onClose={handleCloseDialog}
          title={editingSettlement ? "Edit Settlement" : "Record Settlement"}
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
                form="settlement-form"
                className="btn btn-primary"
                disabled={operationLoading}
              >
                {operationLoading ? (
                  <>
                    <LoadingSpinner
                      config={{ size: "small", showText: false }}
                      className="me-2"
                    />
                    {editingSettlement ? "Updating..." : "Recording..."}
                  </>
                ) : editingSettlement ? (
                  "Update Settlement"
                ) : (
                  "Record Settlement"
                )}
              </button>
            </>
          }
        >
          <form id="settlement-form" onSubmit={handleRecordSettlement}>
            {submitError && (
              <div className="alert alert-danger" role="alert">
                {submitError}
              </div>
            )}
            <SelectField
              label="From"
              value={newSettlement.from}
              onChange={(newFrom) => {
                // If the selected 'from' is the same as 'to', clear 'to'
                const updatedTo =
                  newFrom === newSettlement.to ? "" : newSettlement.to;
                setNewSettlement({
                  ...newSettlement,
                  from: newFrom,
                  to: updatedTo,
                });
              }}
              options={[
                { label: "Select who is paying", value: "" },
                ...users.map((user) => ({
                  label: user.name,
                  value: user.id,
                })),
              ]}
              required
              placeholder="Select who is paying"
              id="settlement-from"
            />
            <SelectField
              label="To"
              value={newSettlement.to}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  to: value,
                })
              }
              options={[
                { label: "Select who will receive", value: "" },
                ...users
                  .filter((user) => user.id !== newSettlement.from)
                  .map((user) => ({
                    label: user.name,
                    value: user.id,
                  })),
              ]}
              required
              placeholder="Select who will receive"
              id="settlement-to"
            />
            <InputField
              label="Amount"
              type="number"
              step="0.01"
              value={newSettlement.amount}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  amount: value,
                })
              }
              required
              id="settlement-amount"
            />
            <SelectField
              label="Status"
              value={newSettlement.status}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  status: value as "borrow" | "settled",
                })
              }
              options={[
                { label: "Borrow", value: "borrow" },
                { label: "Settled", value: "settled" },
              ]}
              required
              id="settlement-status"
            />
            <DateField
              label="Date"
              value={newSettlement.date}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  date: value,
                })
              }
              required
              id="settlement-date"
            />
            <TextareaField
              label="Description (Optional)"
              rows={3}
              value={newSettlement.description}
              onChange={(value) =>
                setNewSettlement({
                  ...newSettlement,
                  description: value,
                })
              }
              placeholder="Optional note about this settlement..."
              id="settlement-description"
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
      </div>
    </MainLayout>
  );
};

export default SettlementsPage;
