"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { NotificationsDataSource, type Notification } from "@/datasource";
import { useAuth } from "@/contexts/AuthContext";
import { useTheme } from "@/contexts/ThemeContext";
import { LoadingSpinner } from "@/shared/components";

const NotificationBell: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const { user } = useAuth();
  const { theme } = useTheme();
  const bellRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hasFetchedRef = useRef(false);

  // Memoize fetchNotifications to prevent recreating on every render
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await NotificationsDataSource.getNotifications(1, 100);
      setNotifications(response.notifications);
      setUnreadCount(response.unreadCount);
    } catch (err) {      setError("Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Only fetch once when user is authenticated
    if (user && !hasFetchedRef.current) {
      hasFetchedRef.current = true;
      fetchNotifications();
    } else if (!user) {
      // Reset when user logs out
      hasFetchedRef.current = false;
      setNotifications([]);
      setUnreadCount(0);
    }
  }, [user, fetchNotifications]);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    // Set initial state
    checkMobile();

    // Add resize listener
    window.addEventListener("resize", checkMobile);

    return () => {
      window.removeEventListener("resize", checkMobile);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        panelRef.current &&
        !panelRef.current.contains(event.target as Node) &&
        bellRef.current &&
        !bellRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isOpen) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      window.dispatchEvent(
        new CustomEvent("notificationPanelOpen", { detail: true })
      );
    } else {
      window.dispatchEvent(
        new CustomEvent("notificationPanelOpen", { detail: false })
      );
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscapeKey);
      window.dispatchEvent(
        new CustomEvent("notificationPanelOpen", { detail: false })
      );
    };
  }, [isOpen]);

  const markAsRead = async (notificationId: string) => {
    try {
      await NotificationsDataSource.markAsRead(notificationId);
      setNotifications((prev) =>
        prev.map((notif) =>
          notif._id === notificationId ? { ...notif, read: true } : notif
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (err) {      // Show user-friendly error message
      setError("Failed to mark notification as read. Please try again.");
      // Clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  const markAllAsRead = async () => {
    try {
      await NotificationsDataSource.markAllAsRead();
      setNotifications((prev) =>
        prev.map((notif) => ({ ...notif, read: true }))
      );
      setUnreadCount(0);
    } catch (err) {      // Show user-friendly error message
      setError("Failed to mark all notifications as read. Please try again.");
      // Clear error after 3 seconds
      setTimeout(() => {
        setError(null);
      }, 3000);
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "expense":
        return "💰";
      case "settlement":
        return "🤝";
      case "reminder":
        return "⏰";
      default:
        return "🔔";
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="position-relative" ref={bellRef}>
      <div
        className="position-relative"
        onClick={() => setIsOpen(!isOpen)}
        style={{
          cursor: "pointer",
          padding: "8px",
          border: "1px solid var(--notification-bell-border)",
          borderRadius: "6px",
          background: isOpen
            ? "var(--notification-bell-active)"
            : "var(--notification-bell-bg)",
          transition: "all 150ms ease",
        }}
        onMouseEnter={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "var(--notification-bell-hover)";
          }
        }}
        onMouseLeave={(e) => {
          if (!isOpen) {
            e.currentTarget.style.background = "var(--notification-bell-bg)";
          }
        }}
        role="button"
        tabIndex={0}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <i
          className="bi bi-bell-fill"
          style={{ padding: "0 0.2rem", color: "var(--icon-accent)" }}
        ></i>
        {unreadCount > 0 && (
          <span
            className="position-absolute badge bg-danger rounded-pill"
            style={{
              top: "0",
              right: "0",
              fontSize: "0.7rem",
              minWidth: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0.1rem",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </div>

      {isOpen && (
        <div
          ref={panelRef}
          className="position-absolute shadow-lg border rounded"
          style={{
            background: "var(--notification-panel-bg)",
            borderColor: "var(--notification-panel-border)",
            boxShadow: "var(--notification-panel-shadow)",
            color: "var(--notification-panel-text)",
            ...(isMobile
              ? {
                  inset: "auto auto 100% 0%",
                }
              : {
                  top: "100%",
                  left: "50%",
                  transform: "translateX(-50%)",
                  marginTop: "8px",
                }),
            width: isMobile ? "94vw" : "350px",
            maxHeight: isMobile ? "37vh" : "60vh",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
            borderRadius: "8px",
            zIndex: 1050,
            marginBottom: isMobile ? "8px" : "0",
          }}
        >
          <div
            style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--notification-panel-header-border)",
              background: "var(--notification-panel-header-bg)",
              flexShrink: 0,
            }}
          >
            <div className="d-flex justify-content-between align-items-center">
              <h6
                className="mb-0 fw-bold"
                style={{ color: "var(--notification-panel-text)" }}
              >
                Notifications
              </h6>
              <div className="d-flex align-items-center gap-2">
                {unreadCount > 0 && (
                  <button
                    className="btn btn-sm"
                    onClick={markAllAsRead}
                    disabled={loading}
                    style={{
                      borderColor: "var(--btn-primary-bg)",
                      color: "var(--btn-primary-bg)",
                      backgroundColor: "transparent",
                      border: "1px solid",
                    }}
                  >
                    Mark all read
                  </button>
                )}
                <button
                  className="btn btn-sm"
                  onClick={() => setIsOpen(false)}
                  aria-label="Close notifications"
                  style={{
                    border: "1px solid var(--notification-panel-border)",
                    background: "transparent",
                    color: "var(--notification-panel-text)",
                    padding: "4px 8px",
                    minWidth: "32px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--notification-panel-item-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "transparent";
                  }}
                >
                  <i
                    className="bi bi-x"
                    style={{ fontSize: "18px", lineHeight: "1" }}
                  ></i>
                </button>
              </div>
            </div>
            {notifications.length > 0 && (
              <small
                style={{ color: "var(--notification-panel-text-secondary)" }}
              >
                {unreadCount > 0
                  ? `${unreadCount} unread of ${notifications.length}`
                  : `${notifications.length} notifications`}
              </small>
            )}
          </div>

          {error && (
            <div
              className="alert alert-danger mx-2 mt-2 mb-2"
              role="alert"
              style={{
                background: "var(--notification-error-bg)",
                borderColor: "var(--notification-error-border)",
                color: "var(--notification-error-text)",
                fontSize: "0.8rem",
                padding: "6px 10px",
                borderRadius: "4px",
              }}
            >
              <i className="bi bi-exclamation-triangle me-1"></i>
              {error}
            </div>
          )}
          {loading ? (
            <div className="text-center p-4">
              <LoadingSpinner
                config={{
                  size: "small",
                  variant: "primary",
                  showText: true,
                  text: "Loading notifications...",
                  centered: true,
                }}
              />
            </div>
          ) : error ? (
            <div className="text-center p-4">
              <div className="text-danger mb-2">
                <i className="fas fa-exclamation-triangle"></i>
              </div>
              <div>{error}</div>
              <button
                className="btn btn-sm mt-2"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--btn-primary-bg)",
                  border: "1px solid var(--btn-primary-bg)",
                  padding: "0.25rem 0.75rem",
                }}
                onClick={fetchNotifications}
              >
                Retry
              </button>
            </div>
          ) : notifications.length === 0 ? (
            <div className="text-center p-4">
              <div
                className="mb-2"
                style={{ color: "var(--notification-panel-text-secondary)" }}
              >
                <i className="bi bi-bell-slash fa-2x"></i>
              </div>
              <div
                style={{ color: "var(--notification-panel-text-secondary)" }}
              >
                No notifications yet
              </div>
            </div>
          ) : (
            <div className="notification-list">
              {notifications.map((notification) => (
                <div
                  key={notification._id}
                  style={{
                    padding: "10px 12px",
                    borderBottom:
                      "1px solid var(--notification-panel-header-border)",
                    background: !notification.read
                      ? "var(--notification-panel-unread-bg)"
                      : "transparent",
                    cursor: "pointer",
                    transition: "background-color 0.2s ease",
                  }}
                  onClick={() =>
                    !notification.read && markAsRead(notification._id)
                  }
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background =
                      "var(--notification-panel-item-hover)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = !notification.read
                      ? "var(--notification-panel-unread-bg)"
                      : "transparent";
                  }}
                >
                  <div className="d-flex align-items-start">
                    <div className="me-2" style={{ fontSize: "1.2rem" }}>
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-grow-1">
                      <div className="d-flex justify-content-between align-items-start">
                        <p
                          className={`mb-1 ${!notification.read ? "fw-bold" : "fw-normal"}`}
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--notification-panel-text)",
                            lineHeight: "1.2",
                          }}
                        >
                          {notification.message}
                        </p>
                        {!notification.read && (
                          <span
                            className="bg-primary rounded-circle ms-2"
                            style={{
                              width: "8px",
                              height: "8px",
                              minWidth: "8px",
                              marginTop: "6px",
                            }}
                          />
                        )}
                      </div>
                      <small
                        style={{
                          fontSize: "0.7rem",
                          color: "var(--notification-panel-text-secondary)",
                        }}
                      >
                        {formatTime(notification.createdAt)}
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
