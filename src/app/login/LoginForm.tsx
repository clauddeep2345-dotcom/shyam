'use client';

import React, { useState } from 'react';
import { login } from '@/actions/auth';
import styles from './login.module.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const result = await login(email, password);
    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // On success, the server action redirects automatically
  };

  return (
    <form className={styles.form} onSubmit={handleLogin}>
      {error && <div className={styles.errorMessage}>{error}</div>}
      
      <div className={styles.inputGroup}>
        <label htmlFor="email">Email</label>
        <input 
          id="email"
          type="email" 
          value={email} 
          onChange={(e) => setEmail(e.target.value)} 
          placeholder="admin@shyamtextile.com"
          required 
          disabled={loading}
        />
      </div>
      
      <div className={styles.inputGroup}>
        <label htmlFor="password">Password</label>
        <input 
          id="password"
          type="password" 
          value={password} 
          onChange={(e) => setPassword(e.target.value)} 
          placeholder="••••••••"
          required 
          disabled={loading}
        />
      </div>
      
      <button 
        type="submit" 
        className={styles.submitButton}
        disabled={loading}
      >
        {loading ? 'Authenticating...' : 'Sign In'}
      </button>
    </form>
  );
}
