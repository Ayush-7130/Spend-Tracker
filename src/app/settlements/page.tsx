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
  Table,
  EmptyState,
  SelectField,
  InputField,
  DateField,
  TextareaField,
} from "@/shared/components";

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
  const [filters, setFilters] = useState({
    search: "",
    fromUser: "",
    toUser: "",
    startDate: "",
    endDate: "",
    sortBy: "date",
    sortOrder: "desc",
  });

  // Record Settlement Dialog states
  const [showSettlementDialog, setShowSettlementDialog] = useState(false);
  const [newSettlement, setNewSettlement] = useState({
    from: "",
    to: "",
    amount: "",
    date: new Date().toISOString().split("T")[0],
    description: "",
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

  const getSortIcon = (column: string) => {
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
      console.error("Error fetching settlements data:", error);
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
      console.error("Error refreshing settlements:", error);
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
        });
        // Refresh data with optimized approach
        await refreshSettlements();
        setSubmitError(null); // Clear any previous errors
        notifyAdded("Settlement");
      } else {
        const errorData = await response.json();
        setSubmitError(errorData.error || "Failed to record settlement");
      }
    } catch {
      setSubmitError("Error recording settlement");
    } finally {
      setOperationLoading(false);
    }
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
      console.error("Error deleting settlement:", error);
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
                        <i className="bi bi-exclamation-triangle text-danger fs-5 me-2"></i>
                        <div>
                          <h5 className="mb-0 text-danger">
                            ₹{balances.summary.totalOwed}
                          </h5>
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
                          <h5 className="mb-0 text-success">
                            ₹{balances.summary.totalSettled}
                          </h5>
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
                          <h5 className="mb-0 text-primary">
                            {balances.summary.totalTransactions}
                          </h5>
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
                          <h5 className="mb-0 text-warning">
                            {balances.summary.activeBalances}
                          </h5>
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
                  <Table
                    config={{
                      columns: [
                        {
                          key: "fromUser",
                          header: "From",
                          accessor: "fromUser",
                          render: (value, row) => (
                            <div className="d-flex align-items-center">
                              <div
                                className="avatar-xs bg-danger text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  fontSize: "10px",
                                }}
                              >
                                {value.charAt(0).toUpperCase()}
                              </div>
                              <span>
                                {value.charAt(0).toUpperCase() +
                                  value.slice(1).toLowerCase()}
                              </span>
                            </div>
                          ),
                        },
                        {
                          key: "toUser",
                          header: "To",
                          accessor: "toUser",
                          render: (value, row) => (
                            <div className="d-flex align-items-center">
                              <div
                                className="avatar-xs bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  fontSize: "10px",
                                }}
                              >
                                {value.charAt(0).toUpperCase()}
                              </div>
                              <span>
                                {value.charAt(0).toUpperCase() +
                                  value.slice(1).toLowerCase()}
                              </span>
                            </div>
                          ),
                        },
                        {
                          key: "amount",
                          header: "Amount",
                          accessor: "amount",
                          render: (value) => (
                            <span className="fw-bold text-danger">
                              ₹{value}
                            </span>
                          ),
                        },
                      ],
                      data: balances.balances.filter(
                        (balance) => balance.status === "owes"
                      ),
                      keyExtractor: (balance) =>
                        `${balance.fromUser}-${balance.toUser}`,
                      hover: true,
                      responsive: true,
                      size: "small",
                    }}
                  />
                </div>
              </div>
            )}

            {balances && balances.balances.length === 0 && (
              <div className="card mb-3">
                <div className="card-body text-center py-5">
                  <i className="bi bi-check-circle-fill text-success display-1"></i>
                  <h4 className="mt-3 text-success">All Settled Up!</h4>
                  <p className="text-muted">
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
                  colSize: 3,
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
                  colSize: 2,
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
                  fromUser: "",
                  toUser: "",
                  startDate: "",
                  endDate: "",
                  sortBy: "date",
                  sortOrder: "desc",
                });
              }}
            />

            {/* Full Settlement Table */}
            <div className="card">
              <div className="card-header">
                <h5 className="mb-0">
                  <i className="bi bi-table me-2"></i>
                  All Settlements
                </h5>
              </div>
              <div
                className="card-body"
                style={{ overflowX: "auto", overflowY: "visible" }}
              >
                {filteredSettlements.length > 0 ? (
                  <Table
                    config={{
                      columns: [
                        {
                          key: "date",
                          header: "Date",
                          accessor: "date",
                          sortable: true,
                          render: (value) => (
                            <span className="text-muted">
                              {formatDate(value)}
                            </span>
                          ),
                        },
                        {
                          key: "fromUser",
                          header: "From",
                          accessor: "fromUser",
                          sortable: true,
                          render: (value) => (
                            <div className="d-flex align-items-center">
                              <div
                                className="avatar-xs bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  fontSize: "10px",
                                }}
                              >
                                {value.charAt(0).toUpperCase()}
                              </div>
                              <span>
                                {value.charAt(0).toUpperCase() +
                                  value.slice(1).toLowerCase()}
                              </span>
                            </div>
                          ),
                        },
                        {
                          key: "toUser",
                          header: "To",
                          accessor: "toUser",
                          sortable: true,
                          render: (value) => (
                            <div className="d-flex align-items-center">
                              <div
                                className="avatar-xs bg-success text-white rounded-circle d-flex align-items-center justify-content-center me-2"
                                style={{
                                  width: "24px",
                                  height: "24px",
                                  fontSize: "10px",
                                }}
                              >
                                {value.charAt(0).toUpperCase()}
                              </div>
                              <span>
                                {value.charAt(0).toUpperCase() +
                                  value.slice(1).toLowerCase()}
                              </span>
                            </div>
                          ),
                        },
                        {
                          key: "amount",
                          header: "Amount",
                          accessor: "amount",
                          sortable: true,
                          render: (value) => (
                            <span className="fw-bold text-success">
                              ₹{value}
                            </span>
                          ),
                        },
                        {
                          key: "description",
                          header: "Description",
                          accessor: "description",
                          render: (value) => (
                            <span className="text-muted">
                              {value || "Settlement payment"}
                            </span>
                          ),
                        },
                        {
                          key: "status",
                          header: "Status",
                          render: () => (
                            <StatusBadge status="settled" type="settlement" />
                          ),
                        },
                      ],
                      data: filteredSettlements,
                      keyExtractor: (settlement) => settlement._id,
                      hover: true,
                      responsive: true,
                      sortable: true,
                      defaultSort: {
                        column: filters.sortBy,
                        direction: filters.sortOrder as "asc" | "desc",
                      },
                      onSort: (sort) => {
                        handleSort(sort.column);
                      },
                      actions: [
                        {
                          label: "Delete",
                          icon: "bi-trash",
                          onClick: (settlement) =>
                            handleDeleteSettlement(settlement._id),
                          variant: "danger",
                        },
                      ],
                    }}
                  />
                ) : (
                  <EmptyState
                    icon="💼"
                    title="No Settlements Yet"
                    description="Settlement history will appear here once you start recording balance settlements."
                    size="large"
                    actions={[
                      {
                        label: "Record Settlement",
                        onClick: () => setShowSettlementDialog(true),
                        variant: "primary",
                        icon: "plus",
                      },
                    ]}
                  />
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
          onClose={() => setShowSettlementDialog(false)}
          title="Record Settlement"
          loading={operationLoading}
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
