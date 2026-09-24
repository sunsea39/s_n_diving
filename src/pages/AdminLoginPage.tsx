import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { usePageTitle } from '../lib/pageTitle';
import { supabase } from '../lib/supabase';

export function AdminLoginPage() {
  usePageTitle('管理者ログイン');
  const { configured, refreshSession } = useAppData();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;

    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error) return setError(result.error.message);

    await refreshSession();
    const admin = await supabase.rpc('is_admin');
    if (!admin.data) {
      await supabase.auth.signOut();
      return setError('このアカウントには管理者権限がありません。');
    }
    navigate('/admin');
  };

  return (
    <>
      <p className="kicker">管理者</p>
      <h1>ログイン</h1>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="form-grid">
          <label>
            メールアドレス
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              autoComplete="email"
            />
          </label>
          <label>
            パスワード
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <button className="button" disabled={!configured}>
          ログイン
        </button>
      </form>
    </>
  );
}
