import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const { login, isAdmin, loading } = useAuth();
  const navigate = useNavigate();

  // 1. Auto-redirect if already logged in
  useEffect(() => {
    if (!loading && isAdmin) {
      navigate('/dashboard?tab=orders');
    }
  }, [isAdmin, loading, navigate]);

  // Load remembered username on mount
  useEffect(() => {
    const saved = localStorage.getItem('barakah_remembered_user');
    if (saved) {
      setUsername(saved);
      setRememberMe(true);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setError('');

    try {
      const success = await login(username, password, rememberMe);
      if (success) {
        // Handle Username persistence for UX
        if (rememberMe) {
          localStorage.setItem('barakah_remembered_user', username);
        } else {
          localStorage.removeItem('barakah_remembered_user');
        }
        navigate('/dashboard?tab=orders');
      } else {
        setError('Invalid credentials. Please try again.');
      }
    } catch (err) {
      console.error(err);
      setError('Network error. Please try again.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (loading) return null;

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'var(--bg-color)',
      padding: '2rem'
    }}>
      <div style={{
        backgroundColor: 'white',
        padding: '48px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.05)',
        width: '380px',
        minHeight: '500px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        boxSizing: 'border-box',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <h1 style={{ 
            fontSize: '2.25rem', 
            letterSpacing: '-1px', 
            fontWeight: 700, 
            marginBottom: '4px', 
            fontFamily: '"Playfair Display", serif',
            color: 'var(--text-dark)'
          }}>
            Barakah
          </h1>
          <p style={{ color: 'var(--gray-text)', fontSize: '0.875rem', fontWeight: 500 }}>User Authentication</p>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#ffefeb',
            color: '#d9381e',
            padding: '10px',
            borderRadius: '8px',
            marginBottom: '1rem',
            fontSize: '0.8rem',
            textAlign: 'center',
            width: '100%',
            border: '1px solid #ffe2e2'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '100%' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                border: '1px solid var(--gray-subtle)',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '0.9rem',
                backgroundColor: 'white'
              }}
            />
          </div>
          <div style={{ position: 'relative' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '0.875rem', fontWeight: 'bold', color: 'var(--text-dark)' }}>Password</label>
            <input
              type={showPassword ? "text" : "password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '10px',
                paddingRight: '40px',
                border: '1px solid var(--gray-subtle)',
                borderRadius: '8px',
                outline: 'none',
                fontSize: '0.9rem',
                backgroundColor: 'white'
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={{
                position: 'absolute',
                right: '12px',
                bottom: '10px',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--gray-text)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px'
              }}
            >
              {showPassword ? (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2.5 14c2-3.5 5-6.5 9.5-6.5s7.5 3 9.5 6.5"></path>
                  <path d="M9 14a3 3 0 1 0 6 0 3 3 0 0 0-6 0"></path>
                  <line x1="2" y1="2" x2="22" y2="22"></line>
                </svg>
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 14c2-4 5-7 10-7s8 3 10 7"></path>
                  <circle cx="12" cy="14" r="3.5"></circle>
                </svg>
              )}
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <label htmlFor="rememberMe" style={{ fontSize: '0.875rem', color: 'var(--gray-text)', cursor: 'pointer', fontWeight: 500 }}>
              Remember Me
            </label>
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={isLoggingIn}
            style={{ 
              marginTop: '0.5rem',
              padding: '1rem',
              borderRadius: '50px',
              fontSize: '1rem',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '1px',
              cursor: 'pointer',
              backgroundColor: 'var(--primary-color)',
              color: 'white',
              border: 'none',
              marginBottom: '2rem'
            }}
          >
            {isLoggingIn ? 'Authenticating...' : 'Login'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'auto' }}>
          <Link to="/" style={{ color: 'var(--gray-text)', fontSize: '0.875rem', fontWeight: 500 }}>&larr; Back to Barakah</Link>
        </div>
      </div>
    </div>
  );
}
