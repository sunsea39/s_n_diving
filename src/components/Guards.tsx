import { Navigate, useLocation } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { SetupOnlyPage } from '../pages/SetupOnlyPage';

export function BoardGuard({ children }: { children: React.ReactNode }) {
  const { configured, isBoardMember, authChecked, profile, user } = useAppData();
  const location = useLocation();

  if (!configured) return <SetupOnlyPage />;
  if (!authChecked) return <p>セッションを確認中です…</p>;
  if (!user)
    return <Navigate to={`/login?next=${encodeURIComponent(location.pathname)}`} replace />;
  if (profile?.role === 'pending') return <Navigate to="/pending" replace />;
  if (profile?.role === 'suspended') return <Navigate to="/suspended" replace />;
  if (!isBoardMember) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { configured, isEditor, authChecked, profile, user } = useAppData();

  if (!configured) return <SetupOnlyPage />;
  if (!authChecked) return <p>セッションを確認中です…</p>;
  if (!user) return <Navigate to="/login?next=%2Fadmin" replace />;
  if (profile?.role === 'pending') return <Navigate to="/pending" replace />;
  if (profile?.role === 'suspended') return <Navigate to="/suspended" replace />;
  return isEditor ? <>{children}</> : <p className="error">このページを開く権限がありません。</p>;
}
