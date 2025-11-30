import React, { useEffect, useState } from "react";

export interface NotificationProps {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

interface NotificationItemProps extends NotificationProps {
  isVisible: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  id,
  type,
  title,
  message,
  duration = 5000,
  onClose,
  isVisible,
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        if (newProgress <= 0) {
          clearInterval(interval);
          onClose(id);
          return 0;
        }
        return newProgress;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isVisible, duration, id, onClose]);

  const getTypeConfig = () => {
    switch (type) {
      case "success":
        return {
          bgClass: "alert-success",
          icon: "bi-check-circle-fill",
          borderColor: "var(--notification-success-border)",
        };
      case "error":
        return {
          bgClass: "alert-danger",
          icon: "bi-x-circle-fill",
          borderColor: "var(--notification-error-border)",
        };
      case "warning":
        return {
          bgClass: "alert-warning",
          icon: "bi-exclamation-triangle-fill",
          borderColor: "var(--notification-warning-border)",
        };
      case "info":
        return {
          bgClass: "alert-info",
          icon: "bi-info-circle-fill",
          borderColor: "var(--notification-info-border)",
        };
      default:
        return {
          bgClass: "alert-secondary",
          icon: "bi-bell-fill",
          borderColor: "var(--border-secondary)",
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      className={`alert ${config.bgClass} alert-dismissible d-flex align-items-start mb-3 shadow-sm notification-item ${
        isVisible ? "slide-in" : "slide-out"
      }`}
      style={{
        position: "relative",
        overflow: "hidden",
        border: `1px solid ${config.borderColor}`,
        borderRadius: "8px",
        animation: isVisible
          ? "slideInRight 0.3s ease-out"
          : "slideOutRight 0.3s ease-in",
      }}
    >
      <i
        className={`bi ${config.icon} me-3`}
        style={{ fontSize: "1.2em", marginTop: "2px" }}
      ></i>
      <div className="flex-grow-1">
        <div className="fw-bold">{title}</div>
        {message && <div className="small mt-1">{message}</div>}
      </div>
      <button
        type="button"
        className="btn-close"
        onClick={() => onClose(id)}
        aria-label="Close"
      ></button>

      {/* Progress bar */}
      <div
        className="position-absolute bottom-0 start-0"
        style={{
          height: "3px",
          backgroundColor: "rgba(0,0,0,0.1)",
          width: `${progress}%`,
          transition: "width 0.1s linear",
        }}
      ></div>

      <style jsx>{`
        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        @keyframes slideOutRight {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }

        .notification-item {
          transition: all 0.3s ease;
        }

        .notification-item:hover {
          transform: translateX(-5px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
        }

        /* Mobile responsive styles */
        @media (max-width: 576px) {
          .notification-container {
            top: 10px !important;
            right: 10px !important;
            left: 10px !important;
            width: auto !important;
            max-width: 280px !important;
          }
        }

        @media (max-width: 375px) {
          .notification-container {
            top: 5px !important;
            right: 5px !important;
            left: 5px !important;
            max-width: 260px !important;
          }

          .notification-item {
            padding: 0.4rem !important;
            margin-bottom: 0.4rem !important;
          }

          .notification-item .fw-bold {
            font-size: 0.85rem !important;
            line-height: 1.2 !important;
          }

          .notification-item .small {
            font-size: 0.7rem !important;
          }

          .notification-item .bi {
            font-size: 0.9rem !important;
          }
        }

        /* Extra small devices */
        @media (max-width: 320px) {
          .notification-container {
            max-width: 240px !important;
          }

          .notification-item {
            padding: 0.3rem !important;
          }

          .notification-item .fw-bold {
            font-size: 0.8rem !important;
          }
        }
      `}</style>
    </div>
  );
};

interface NotificationContainerProps {
  notifications: NotificationProps[];
  onClose: (id: string) => void;
}

export const NotificationContainer: React.FC<NotificationContainerProps> = ({
  notifications,
  onClose,
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>(
    []
  );

  useEffect(() => {
    // Show new notifications
    const newNotificationIds = notifications
      .map((n) => n.id)
      .filter((id) => !visibleNotifications.includes(id));

    if (newNotificationIds.length > 0) {
      setVisibleNotifications((prev) => [...prev, ...newNotificationIds]);
    }
  }, [notifications, visibleNotifications]);

  const handleClose = (id: string) => {
    // Remove from visible list first (for animation)
    setVisibleNotifications((prev) => prev.filter((notifId) => notifId !== id));

    // Then remove from notifications after animation
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  if (notifications.length === 0) return null;

  return (
    <div
      className="position-fixed notification-container"
      style={{
        top: "20px",
        right: "20px",
        zIndex: 9999,
        maxWidth: "320px",
        width: "100%",
      }}
    >
      {notifications.map((notification) => (
        <NotificationItem
          key={notification.id}
          {...notification}
          isVisible={visibleNotifications.includes(notification.id)}
          onClose={handleClose}
        />
      ))}
    </div>
  );
};
