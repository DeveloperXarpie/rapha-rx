import { Navigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store';

export default function RequireProfile() {
  const activeProfile = useAppStore((s) => s.activeProfile);
  if (!activeProfile) return <Navigate to="/" replace />;
  return <Outlet />;
}
