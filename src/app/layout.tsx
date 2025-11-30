import type { Metadata, Viewport } from "next";
import "bootstrap/dist/css/bootstrap.min.css";
import "bootstrap-icons/font/bootstrap-icons.css";
import "./globals.css";
import "@/styles/accessibility.css";
import { ClientWrapper } from "@/components/ClientWrapper";
import ErrorBoundary from "@/components/ErrorBoundary";
import { WebVitalsReporter } from "@/components/WebVitalsReporter";

export const metadata: Metadata = {
  title: "Spend Tracker",
  description: "Track your expenses and manage your budget with ease",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ErrorBoundary>
          <ClientWrapper>{children}</ClientWrapper>
        </ErrorBoundary>
        {/* Performance monitoring - only adds ~5KB gzipped */}
        <WebVitalsReporter />
        <script
          src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/js/bootstrap.bundle.min.js"
          async
        ></script>
      </body>
    </html>
  );
}
