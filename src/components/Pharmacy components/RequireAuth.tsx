import { useAuth } from '@/Pharmacy contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';

export default function RequireAuth({ children }: { children: JSX.Element }) {
  const { user } = useAuth();
  const location = useLocation();

  if (!user) {
    // Redirect to login, preserve intended location
    return <Navigate to="/login" state={{ from: location }} replace />;
  }
  return children;
}
