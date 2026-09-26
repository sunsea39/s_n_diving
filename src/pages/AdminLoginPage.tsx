import { Navigate } from 'react-router-dom';

export function AdminLoginPage() {
  return <Navigate to="/login?next=%2Fadmin" replace />;
}
