import React from 'react';
import Sidebar from '@/components/Sidebar';
import styles from '../dashboard.module.css';

export default function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.dashboardLayout}>
      <Sidebar role="owner" />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
