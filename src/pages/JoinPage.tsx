import { Navigate, useSearchParams } from 'react-router-dom';

export function JoinPage() {
  const [params] = useSearchParams();
  return (
    <Navigate to={`/login?next=${encodeURIComponent(params.get('next') ?? '/board')}`} replace />
  );
}
