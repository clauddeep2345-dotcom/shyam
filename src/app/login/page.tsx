import React from 'react';
import LoginForm from './LoginForm';
import styles from './login.module.css';

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <div className={styles.header}>
          <div className={styles.logoBadge}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2L2 7L12 12L22 7L12 2Z" stroke="#ffffff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 17L12 22L22 17" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M2 12L12 17L22 12" stroke="#facc15" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <h1 className={styles.title}>SHYAM TEXTILE</h1>
          <p className={styles.subtitle}>Industrial Operations & Production Console</p>
        </div>
        
        <LoginForm />
        
        <div className={styles.footer}>
          <p>&copy; {new Date().getFullYear()} Shyam Textile. All rights reserved.</p>
        </div>
      </div>
      
      {/* Decorative ambient background orbs */}
      <div className={styles.circle1} />
      <div className={styles.circle2} />
      <div className={styles.circle3} />
    </div>
  );
}
