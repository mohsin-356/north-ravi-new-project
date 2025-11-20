import React from 'react';
import Login from '@/components/Pharmacy components/Login';
import { useAuth } from '@/Pharmacy contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogin = async (user: any) => {
    // Persist full user profile in context so downstream components have role/name/id
    await login({
      id: user._id || user.id,
      name: user.name || user.username,
      role: user.role,
      username: user.username,
      ...user,
    });

    // Always take user to dashboard after login for a smooth and predictable start
    try { localStorage.setItem('activeModule', 'dashboard'); } catch {}
    navigate('/dashboard', { replace: true });
  };

  return <Login onLogin={handleLogin} isUrdu={false} setIsUrdu={() => {}} />;
}
