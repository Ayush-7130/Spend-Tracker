'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ThemeToggle, useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import NotificationBell from './NotificationBell';

export default function Navigation() {
  const pathname = usePathname();
  const { user, logout, isAuthenticated } = useAuth();
  const { theme } = useTheme();

  const navItems = [
    { href: '/', label: 'Dashboard', icon: 'bi-house-door' },
    { href: '/expenses', label: 'Expenses', icon: 'bi-list-ul' },
    { href: '/categories', label: 'Categories', icon: 'bi-tags' },
    { href: '/settlements', label: 'Settlements', icon: 'bi-currency-exchange' },
    { href: '/analytics', label: 'Analytics', icon: 'bi-graph-up' },
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Don't show navigation on login/signup pages
  if (pathname === '/login' || pathname === '/signup') {
    return null;
  }

  return (
    <nav className={`navbar navbar-expand-lg sticky-top ${
      theme === 'dark' ? 'navbar-dark bg-primary' : 'navbar-light bg-light border-bottom'
    }`}>
      <div className="container-fluid">
        <Link className={`navbar-brand fw-bold ${
          theme === 'dark' ? 'text-white' : 'text-dark'
        }`} href="/">
          <i className="bi bi-wallet2 me-2"></i>
          Spend Tracker
        </Link>
        
        <button
          className={`navbar-toggler ${
            theme === 'dark' ? 'navbar-toggler-dark' : 'navbar-toggler-light'
          }`}
          type="button"
          data-bs-toggle="collapse"
          data-bs-target="#navbarNav"
          aria-controls="navbarNav"
          aria-expanded="false"
          aria-label="Toggle navigation"
          style={{
            borderColor: theme === 'dark' ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.1)'
          }}
        >
          <span className="navbar-toggler-icon" style={{
            backgroundImage: theme === 'dark' ? 
              `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%28255, 255, 255, 0.75%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e")` :
              `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 30 30'%3e%3cpath stroke='rgba%2833, 37, 41, 0.75%29' stroke-linecap='round' stroke-miterlimit='10' stroke-width='2' d='M4 7h22M4 15h22M4 23h22'/%3e%3c/svg%3e")`
          }}></span>
        </button>
        
        <div className="collapse navbar-collapse" id="navbarNav">
          {isAuthenticated && (
            <ul className="navbar-nav me-auto">
              {navItems.map((item) => (
                <li className="nav-item" key={item.href}>
                  <Link
                    className={`nav-link ${
                      pathname === item.href ? 'active' : ''
                    } ${
                      theme === 'dark' ? 'text-white' : 'text-dark'
                    }`}
                    href={item.href}
                  >
                    <i className={`${item.icon} me-1`}></i>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          
          {/* Mobile: User Account and Sign Out - Inside hamburger */}
          <div className="d-lg-none">
            {isAuthenticated ? (
              <div className="mt-2 mb-2">
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center">
                    <i className={`bi bi-person-circle me-2 ${
                      theme === 'dark' ? 'text-white' : 'text-dark'
                    }`}></i>
                    <div className={theme === 'dark' ? 'text-white' : 'text-dark'}>
                      <div className="fw-bold">{user?.name}</div>
                      <small className="opacity-75">{user?.email}</small>
                    </div>
                  </div>
                  <button 
                    className={`btn btn-sm ms-2 ${
                      theme === 'dark' ? 'btn-outline-light' : 'btn-outline-dark'
                    }`}
                    onClick={handleLogout}
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    Sign Out
                  </button>
                </div>
                
                {/* Mobile: Notification and Theme Toggle - Inside hamburger after account */}
                <div className={`d-flex justify-content-between align-items-center mt-3 pt-2 ${
                  theme === 'dark' ? 'border-top border-secondary' : 'border-top border-dark'
                }`}>
                  <div>
                    <NotificationBell />
                  </div>
                  <div>
                    <ThemeToggle />
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-2 mb-2">
                <Link href="/login" className="btn btn-outline-light">
                  <i className="bi bi-box-arrow-in-right me-1"></i>
                  Sign In
                </Link>
                {/* Sign Up disabled - see Navigation.tsx to restore */}
                
                {/* Theme Toggle for non-authenticated users */}
                <div className="mt-3 pt-2 border-top border-secondary text-center">
                  <ThemeToggle />
                </div>
              </div>
            )}
          </div>
        </div>
        
        {/* Desktop: Right side items */}
        <div className="d-none d-lg-flex align-items-center ms-auto">
          {isAuthenticated ? (
            <>
              {/* Notification Bell */}
              <NotificationBell />
              
              {/* User Dropdown */}
              <div className="dropdown ms-3">
                <button
                  className={`btn dropdown-toggle ${
                    theme === 'dark' ? 'btn-outline-light' : 'btn-outline-dark'
                  }`}
                  type="button"
                  id="userDropdown"
                  data-bs-toggle="dropdown"
                  aria-expanded="false"
                  style={{
                    borderColor: theme === 'dark' ? 'var(--navbar-accent)' : 'var(--border-primary)',
                    color: theme === 'dark' ? 'var(--navbar-accent)' : 'var(--text-primary)'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'var(--navbar-hover-bg)';
                    e.currentTarget.style.color = 'var(--navbar-text-hover)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = theme === 'dark' ? 'var(--navbar-accent)' : 'var(--text-primary)';
                  }}
                >
                  <i className={`bi bi-person-circle me-1 ${
                    theme === 'dark' ? 'text-white' : 'text-dark'
                  }`}></i>
                  <span className={theme === 'dark' ? 'text-white' : 'text-dark'}>
                    {user?.name || 'User'}
                  </span>
                </button>
                <ul className={`dropdown-menu dropdown-menu-end ${
                  theme === 'dark' ? 'dropdown-menu-dark' : ''
                }`} aria-labelledby="userDropdown">
                  <li>
                    <span className="dropdown-item-text">
                      <div className="d-flex align-items-center">
                        <i className={`bi bi-person-circle me-2 ${
                          theme === 'dark' ? 'text-white' : 'text-dark'
                        }`}></i>
                        <div>
                          <div className={`fw-bold ${
                            theme === 'dark' ? 'text-white' : 'text-dark'
                          }`}>{user?.name}</div>
                          <small className={`${
                            theme === 'dark' ? 'text-white-50' : 'text-muted'
                          }`}>{user?.email}</small>
                        </div>
                      </div>
                    </span>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button className={`dropdown-item ${
                      theme === 'dark' ? 'text-white' : 'text-dark'
                    }`} onClick={handleLogout}>
                      <i className={`bi bi-box-arrow-right me-2 ${
                        theme === 'dark' ? 'text-white' : 'text-dark'
                      }`}></i>
                      Sign Out
                    </button>
                  </li>
                </ul>
              </div>
            </>
          ) : (
            <div>
              <Link href="/login" className="btn btn-outline-light">
                <i className="bi bi-box-arrow-in-right me-1"></i>
                Sign In
              </Link>
              {/* Sign Up disabled - see Navigation.tsx to restore */}
            </div>
          )}
          
          {/* Theme Toggle */}
          <div className="ms-3">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </nav>
  );
}
