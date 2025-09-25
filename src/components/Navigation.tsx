'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const pathname = usePathname();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'bi-house-door' },
    { href: '/expenses', label: 'Expenses', icon: 'bi-list-ul' },
    { href: '/categories', label: 'Categories', icon: 'bi-tags' },
    { href: '/settlements', label: 'Settlements', icon: 'bi-currency-exchange' },
    { href: '/analytics', label: 'Analytics', icon: 'bi-graph-up' },
  ];

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary sticky-top">
      <div className="container-fluid">
        <Link className="navbar-brand fw-bold" href="/">
          <i className="bi bi-wallet2 me-2"></i>
          Spend Tracker
        </Link>
        
        <button
          className="navbar-toggler"
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
        >
          <span className="navbar-toggler-icon"></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          <ul className="navbar-nav me-auto">
            {navItems.map((item) => (
              <li className="nav-item" key={item.href}>
                <Link
                  className={`nav-link ${pathname === item.href ? 'active' : ''}`}
                  href={item.href}
                >
                  <i className={`${item.icon} me-1`}></i>
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </nav>
  );
}
