import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => api.getUser());
  const [token, setToken] = useState(() => api.getToken());
  const [loading, setLoading] = useState(true);

  // Validate existing token on initial application mount
  useEffect(() => {
    const verifySession = async () => {
      const savedToken = api.getToken();
      if (!savedToken) {
        setLoading(false);
        return;
      }

      try {
        const res = await window.fetch('/api/auth/me', {
          headers: { Authorization: `Bearer ${savedToken}` },
        });

        if (res.ok) {
          const profile = await res.json();
          setUser(profile);
          api.setUser(profile);
        } else {
          // Token expired or invalid
          api.removeToken();
          setUser(null);
          setToken(null);
        }
      } catch (err) {
        console.warn('Session verification error:', err);
      } finally {
        setLoading(false);
      }
    };

    verifySession();

    // Listen for unauthorized 401 events from api interceptor
    const handleUnauthorized = () => {
      api.removeToken();
      setUser(null);
      setToken(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email, password) => {
    const data = await api.post('/api/auth/login', { email, password });
    api.setToken(data.access_token);
    api.setUser(data.user);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const signup = async (fullName, email, password) => {
    const data = await api.post('/api/auth/signup', {
      full_name: fullName,
      email,
      password,
    });
    api.setToken(data.access_token);
    api.setUser(data.user);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const demoLogin = async () => {
    const data = await api.post('/api/auth/demo-login', {});
    api.setToken(data.access_token);
    api.setUser(data.user);
    setToken(data.access_token);
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    api.removeToken();
    setUser(null);
    setToken(null);
  };

  const value = {
    user,
    token,
    isAuthenticated: !!token && !!user,
    loading,
    login,
    signup,
    demoLogin,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

