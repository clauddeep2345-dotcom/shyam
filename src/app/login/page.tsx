import React from 'react';
import LoginForm from './LoginForm';
import styles from './login.module.css';

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={styles.glassCard}>
        <div className={styles.header}>
          <h1 className={styles.title}>SHYAM TEXTILE</h1>
          <p className={styles.subtitle}>Business Management System</p>
        </div>
        
        <LoginForm />
        
        <div className={styles.footer}>
          <p>&copy; {new Date().getFullYear()} Shyam Textile. All rights reserved.</p>
        </div>
      </div>
      
      {/* Decorative background elements */}
      <div className={styles.circle1}></div>
      <div className={styles.circle2}></div>
    </div>
  );
}
