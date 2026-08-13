'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout } from '@/actions/auth';
import styles from './sidebar.module.css';

interface SidebarProps {
  role: 'admin' | 'owner' | 'supervisor';
}

const adminLinks = [
  { href: '/admin', label: 'Dashboard', icon: '📊' },
  { href: '/admin/workers', label: 'Workers', icon: '👥' },
  { href: '/admin/machines', label: 'Machines', icon: '⚙️' },
  { href: '/admin/production', label: 'Production', icon: '🧵' },
  { href: '/admin/payroll', label: 'Payroll', icon: '💰' },
  { href: '/admin/reports/workers', label: 'Worker Report', icon: '📋' },
  { href: '/admin/reports/machines', label: 'Machine Report', icon: '📈' },
];

const ownerLinks = [
  { href: '/owner', label: 'Dashboard', icon: '📊' },
  { href: '/owner/production', label: 'Production', icon: '🧵' },
  { href: '/owner/payroll', label: 'Payroll & History', icon: '💰' },
];

const supervisorLinks = [
  { href: '/supervisor', label: 'Dashboard', icon: '📊' },
  { href: '/supervisor/add-production', label: 'Add Production', icon: '➕' },
  { href: '/supervisor/recent', label: 'Recent Entries', icon: '📝' },
];

export default function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const links = role === 'admin' ? adminLinks : role === 'owner' ? ownerLinks : supervisorLinks;

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
        <span className={styles.mobileRoleBadge}>{role.toUpperCase()}</span>
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
          <h2>SHYAM TEXTILE</h2>
          <span className={styles.roleBadge}>{role.toUpperCase()}</span>
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
            {links.map((link) => {
              const isActive = pathname === link.href || (pathname.startsWith(link.href) && link.href !== `/${role}`);
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
