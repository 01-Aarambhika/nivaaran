import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../api/client';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('nivaaran_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('nivaaran_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('nivaaran_user');
    }
  }, [user]);

  const login = async (userId, password) => {
    setLoading(true);
    try {
      const data = await api.login(userId, password);
      setUser(data);
      return data;
    } finally {
      setLoading(false);
    }
  };

  const quickLogin = async (userId, password = 'demo123') => {
    return await login(userId, password);
  };

  const logout = () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, quickLogin, logout, loading, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
}
