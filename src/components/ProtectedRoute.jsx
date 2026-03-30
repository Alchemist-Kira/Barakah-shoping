import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function ProtectedRoute({ children }) {
  const { isAdmin, loading } = useAuth();

  if (loading) return <div>Loading...</div>;

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
