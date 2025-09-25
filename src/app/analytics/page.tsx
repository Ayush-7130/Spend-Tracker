'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/MainLayout';

export default function AnalyticsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/analytics/overview');
  }, [router]);

  return (
    <MainLayout>
      <div className="container-fluid mt-4">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-3 text-muted">Loading analytics dashboard...</p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
}
