import React from 'react';
import Sidebar from '@/components/Sidebar';
import styles from '../dashboard.module.css';

import { requireRole } from '@/actions/auth';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['admin']);

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar role="admin" />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
