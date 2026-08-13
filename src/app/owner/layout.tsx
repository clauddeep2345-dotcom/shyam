import React from 'react';
import Sidebar from '@/components/Sidebar';
import styles from '../dashboard.module.css';

import { requireRole } from '@/actions/auth';

export default async function OwnerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await requireRole(['owner']);

  return (
    <div className={styles.dashboardLayout}>
      <Sidebar role="owner" />
      <main className={styles.mainContent}>
        {children}
      </main>
    </div>
  );
}
