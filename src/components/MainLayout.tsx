"use client";

import Navigation from "./Navigation";
import { useState, useEffect } from "react";
// Removed useTokenRefresh import - token refresh is now handled by AuthContext
// import { useTokenRefresh } from "@/hooks/useTokenRefresh";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

  // Token refresh is now handled by AuthContext auto-refresh
  // No need to call useTokenRefresh() here to avoid conflicts
  // useTokenRefresh();

  // Listen for notification panel state changes
  useEffect(() => {
    const handleNotificationToggle = (event: CustomEvent) => {
      setIsNotificationPanelOpen(event.detail.isOpen);
    };

    window.addEventListener(
      "notification-panel-toggle",
      handleNotificationToggle as EventListener
    );

    return () => {
      window.removeEventListener(
        "notification-panel-toggle",
        handleNotificationToggle as EventListener
      );
    };
  }, []);

  return (
    <>
      <Navigation />
      <main
        className="container-fluid py-4"
        style={{
          filter: isNotificationPanelOpen ? "blur(2px)" : "none",
          transition: "filter 0.2s ease-in-out",
          pointerEvents: isNotificationPanelOpen ? "none" : "auto",
        }}
      >
        {children}
      </main>
    </>
  );
}
