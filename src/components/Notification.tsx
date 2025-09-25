import React, { useEffect, useState } from 'react';

export interface NotificationProps {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
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
  isVisible
}) => {
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (!isVisible) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - (100 / (duration / 100));
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
      case 'success':
        return {
          bgClass: 'alert-success',
          icon: 'bi-check-circle-fill',
          borderColor: '#d1e7dd'
        };
      case 'error':
        return {
          bgClass: 'alert-danger',
          icon: 'bi-x-circle-fill',
          borderColor: '#f5c2c7'
        };
      case 'warning':
        return {
          bgClass: 'alert-warning',
          icon: 'bi-exclamation-triangle-fill',
          borderColor: '#ffecb5'
        };
      case 'info':
        return {
          bgClass: 'alert-info',
          icon: 'bi-info-circle-fill',
          borderColor: '#b6effb'
        };
      default:
        return {
          bgClass: 'alert-secondary',
          icon: 'bi-bell-fill',
          borderColor: '#e2e3e5'
        };
    }
  };

  const config = getTypeConfig();

  return (
    <div
      className={`alert ${config.bgClass} alert-dismissible d-flex align-items-start mb-3 shadow-sm notification-item ${
        isVisible ? 'slide-in' : 'slide-out'
      }`}
      style={{
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${config.borderColor}`,
        borderRadius: '8px',
        animation: isVisible ? 'slideInRight 0.3s ease-out' : 'slideOutRight 0.3s ease-in'
      }}
    >
      <i className={`bi ${config.icon} me-3`} style={{ fontSize: '1.2em', marginTop: '2px' }}></i>
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
          height: '3px',
          backgroundColor: 'rgba(0,0,0,0.1)',
          width: `${progress}%`,
          transition: 'width 0.1s linear'
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
          box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
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
  onClose
}) => {
  const [visibleNotifications, setVisibleNotifications] = useState<string[]>([]);

  useEffect(() => {
    // Show new notifications
    const newNotificationIds = notifications
      .map(n => n.id)
      .filter(id => !visibleNotifications.includes(id));
    
    if (newNotificationIds.length > 0) {
      setVisibleNotifications(prev => [...prev, ...newNotificationIds]);
    }
  }, [notifications, visibleNotifications]);

  const handleClose = (id: string) => {
    // Remove from visible list first (for animation)
    setVisibleNotifications(prev => prev.filter(notifId => notifId !== id));
    
    // Then remove from notifications after animation
    setTimeout(() => {
      onClose(id);
    }, 300);
  };

  if (notifications.length === 0) return null;

  return (
    <div
      className="position-fixed"
      style={{
        top: '20px',
        right: '20px',
        zIndex: 9999,
        maxWidth: '400px',
        width: '100%'
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