"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import MainLayout from "@/components/MainLayout";
import { LoadingSpinner } from "@/shared/components";

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/analytics/overview");
  }, [router]);

  return (
    <MainLayout>
      <div className="container-fluid mt-4">
        <div style={{ minHeight: "400px" }}>
          <LoadingSpinner
            config={{
              size: "large",
              variant: "primary",
              showText: true,
              text: "Loading analytics dashboard...",
              centered: true,
            }}
          />
        </div>
      </div>
    </MainLayout>
  );
}
