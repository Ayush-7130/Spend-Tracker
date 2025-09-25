'use client';

import Navigation from './Navigation';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  return (
    <>
      <Navigation />
      <main className="container-fluid py-4">
        {children}
      </main>
    </>
  );
}
