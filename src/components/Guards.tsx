import { Navigate, useLocation } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { SetupOnlyPage } from '../pages/SetupOnlyPage';

export function BoardGuard({ children }: { children: React.ReactNode }) {
  const { configured, isBoardMember, authChecked } = useAppData();
  const location = useLocation();

  if (!configured) return <SetupOnlyPage />;
  if (!authChecked) return <p>セッションを確認中です…</p>;
  if (!isBoardMember) {
    return <Navigate to={`/join?next=${encodeURIComponent(location.pathname)}`} replace />;
  }
  return <>{children}</>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { configured, isAdmin, authChecked } = useAppData();

  if (!configured) return <SetupOnlyPage />;
  if (!authChecked) return <p>セッションを確認中です…</p>;
  return isAdmin ? <>{children}</> : <Navigate to="/admin/login" replace />;
}
