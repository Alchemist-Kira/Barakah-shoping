import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [token, setToken] = useState(null);
  const [isPersistent, setIsPersistent] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check both persistent (localStorage) and session-based (sessionStorage)
    const persistentToken = localStorage.getItem('barakah_admin_token');
    const sessionToken = sessionStorage.getItem('barakah_admin_token');
    const storedToken = persistentToken || sessionToken;

    if (storedToken && storedToken.length > 10) {
      setToken(storedToken);
      setIsPersistent(!!persistentToken);
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
      localStorage.removeItem('barakah_admin_token');
      sessionStorage.removeItem('barakah_admin_token');
    }
    setLoading(false);
  }, []);

  const login = async (username, password, rememberMe = false) => {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(password);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, passwordHash: hashedInput, rememberMe })
      });

      if (response.ok) {
        const { token } = await response.json();

        // Use persistent storage if rememberMe is true, otherwise use session-based storage
        if (rememberMe) {
          localStorage.setItem('barakah_admin_token', token);
          sessionStorage.removeItem('barakah_admin_token');
        } else {
          sessionStorage.setItem('barakah_admin_token', token);
          localStorage.removeItem('barakah_admin_token');
        }

        setToken(token);
        setIsPersistent(rememberMe);
        setIsAdmin(true);
        return true;
      }
      return false;
    } catch (err) {
      console.error("Login Error:", err);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('barakah_admin_token');
    sessionStorage.removeItem('barakah_admin_token');
    setToken(null);
    setIsPersistent(false);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider value={{ isAdmin, token, isPersistent, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
