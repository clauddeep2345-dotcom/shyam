'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/actions/auth';
import styles from './sidebar.module.css';

interface SidebarProps {
  role?: string;
}

const navLinks = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/workers', label: 'Workers', icon: '👥' },
  { href: '/admin/machines', label: 'Machines', icon: '⚙️' },
  { href: '/admin/add-production', label: 'Add Production', icon: '➕' },
  { href: '/admin/bulk-production', label: 'Bulk Entry', icon: '🗂️' },
  { href: '/admin/production', label: 'Production', icon: '🧵' },
  { href: '/admin/reports/shifts', label: 'Shift Comparison', icon: '⚖️' },
  { href: '/admin/reports/workers', label: 'Worker Report', icon: '📋' },
  { href: '/admin/reports/machines', label: 'Machine Report', icon: '📈' },
  { href: '/admin/reports/worker-machine', label: 'Worker-Machine', icon: '🔍' },
];

export default function Sidebar({ role = 'admin' }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  // Close sidebar when route changes (mobile navigation)
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <>
      {/* Mobile top bar */}
      <header className={styles.mobileHeader}>
        <button
          className={styles.hamburger}
          onClick={() => setIsOpen(true)}
          aria-label="Open menu"
        >
          <span />
          <span />
          <span />
        </button>
        <span className={styles.mobileBrand}>SHYAM TEXTILE</span>
        <span className={styles.mobileRoleBadge}>
          <span className={styles.statusDot} style={{ display: 'inline-block', marginRight: '4px' }} />
          ADMIN
        </span>
      </header>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className={styles.overlay}
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.brand}>
          <div className={styles.brandLogo}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <div className={styles.brandInfo}>
            <h2 className={styles.brandName}>SHYAM TEXTILE</h2>
            <div className={styles.roleBadge}>
              <span className={styles.statusDot} />
              <span>ADMIN</span>
            </div>
          </div>
        </div>

        {/* Close button (mobile only) */}
        <button
          className={styles.closeButton}
          onClick={() => setIsOpen(false)}
          aria-label="Close menu"
        >
          ✕
        </button>

        <nav className={styles.nav}>
          <ul>
            {navLinks.map((link) => {
              const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== '/admin');
              return (
                <li key={link.href}>
                  <Link href={link.href} className={`${styles.link} ${isActive ? styles.active : ''}`}>
                    <span className={styles.icon}>{link.icon}</span>
                    {link.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className={styles.footer}>
          <button className={styles.logoutButton} onClick={handleLogout}>
            <span className={styles.icon}>🚪</span> Logout
          </button>
        </div>
      </aside>
    </>
  );
}
