"use client";

import Navigation from "./Navigation";
import { useState, useEffect } from "react";

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);

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
