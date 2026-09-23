import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Spinner } from '../ui/Feedback';

/** Renders child routes only for signed-in users. */
export function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === 'loading') return <Spinner label="Restoring your session…" />;
  if (status === 'unauthenticated') return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}

/** Keeps signed-in users away from the login / register pages. */
export function GuestRoute() {
  const { status } = useAuth();
  if (status === 'loading') return <Spinner />;
  if (status === 'authenticated') return <Navigate to="/" replace />;
  return <Outlet />;
}
