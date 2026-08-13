import React from 'react';
import Sidebar from '@/components/Sidebar';
import styles from '../dashboard.module.css';

import { requireRole } from '@/actions/auth';

export default async function SupervisorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['supervisor', 'admin', 'owner']);

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar role="supervisor" />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
