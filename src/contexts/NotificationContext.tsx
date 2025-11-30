import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from "react";
import {
  NotificationContainer,
  NotificationProps,
} from "@/components/Notification";

interface NotificationContextType {
  notifications: NotificationProps[];
  addNotification: (
    notification: Omit<NotificationProps, "id" | "onClose">
  ) => void;
  removeNotification: (id: string) => void;
  clearAllNotifications: () => void;
  // Helper methods for common notification types
  showSuccess: (title: string, message?: string, duration?: number) => void;
  showError: (title: string, message?: string, duration?: number) => void;
  showWarning: (title: string, message?: string, duration?: number) => void;
  showInfo: (title: string, message?: string, duration?: number) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  const [notifications, setNotifications] = useState<NotificationProps[]>([]);

  const removeNotification = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  }, []);

  const addNotification = useCallback(
    (notification: Omit<NotificationProps, "id" | "onClose">) => {
      const id =
        Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const newNotification: NotificationProps = {
        ...notification,
        id,
        onClose: () => {}, // Will be set by the container
      };

      setNotifications((prev) => [...prev, newNotification]);

      // Auto-remove after duration if specified
      if (notification.duration !== 0) {
        const duration = notification.duration || 5000;
        setTimeout(() => {
          removeNotification(id);
        }, duration);
      }
    },
    [removeNotification]
  );

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  // Helper methods for common notification types
  const showSuccess = useCallback(
    (title: string, message?: string, duration?: number) => {
      addNotification({
        type: "success",
        title,
        message,
        duration,
      });
    },
    [addNotification]
  );

  const showError = useCallback(
    (title: string, message?: string, duration?: number) => {
      addNotification({
        type: "error",
        title,
        message,
        duration: duration || 7000, // Errors stay longer by default
      });
    },
    [addNotification]
  );

  const showWarning = useCallback(
    (title: string, message?: string, duration?: number) => {
      addNotification({
        type: "warning",
        title,
        message,
        duration,
      });
    },
    [addNotification]
  );

  const showInfo = useCallback(
    (title: string, message?: string, duration?: number) => {
      addNotification({
        type: "info",
        title,
        message,
        duration,
      });
    },
    [addNotification]
  );

  const contextValue: NotificationContextType = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
      <NotificationContainer
        notifications={notifications}
        onClose={removeNotification}
      />
    </NotificationContext.Provider>
  );
};

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

// Additional helper hook for common operations
export const useOperationNotification = () => {
  const { showSuccess, showError } = useNotification();

  return {
    notifySuccess: (operation: string, item?: string) => {
      const title = `${operation} Successful`;
      const message = item
        ? `${item} has been ${operation.toLowerCase()} successfully`
        : undefined;
      showSuccess(title, message);
    },
    notifyError: (operation: string, error?: string, item?: string) => {
      const title = `${operation} Failed`;
      const message =
        error ||
        (item ? `Failed to ${operation.toLowerCase()} ${item}` : undefined);
      showError(title, message);
    },
    notifyDeleted: (item: string) => {
      showSuccess(
        "Deleted Successfully",
        `${item} has been deleted successfully`
      );
    },
    notifyAdded: (item: string) => {
      showSuccess("Added Successfully", `${item} has been added successfully`);
    },
    notifyUpdated: (item: string) => {
      showSuccess(
        "Updated Successfully",
        `${item} has been updated successfully`
      );
    },
  };
};
