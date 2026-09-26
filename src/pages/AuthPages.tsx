import { useState } from 'react';
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { safeNext, validateDisplayName } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';
import { supabase } from '../lib/supabase';

function destination(role: string | null, next: string) {
  if (role === 'pending') return '/pending';
  if (role === 'suspended') return '/suspended';
  return next;
}

export function LoginPage() {
  usePageTitle('ログイン');
  const { configured, role, user, refreshSession } = useAppData();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const next = safeNext(params.get('next'));
  if (user) return <Navigate to={destination(role, next)} replace />;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supabase) return;
    setBusy(true);
    setError('');
    const result = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (result.error) {
      setError(result.error.message);
      setBusy(false);
      return;
    }
    await refreshSession();
    const profile = await supabase
      .from('profiles')
      .select('role')
      .eq('id', result.data.user.id)
      .maybeSingle();
    navigate(destination(profile.data?.role ?? null, next), { replace: true });
  };
  return (
    <>
      <p className="kicker">アカウント</p>
      <h1>ログイン</h1>
      <form className="panel form-panel" onSubmit={submit}>
        <label>
          メールアドレス
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          パスワード
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        <label className="inline-check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          表示する
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" disabled={!configured || busy}>
          {busy ? 'ログイン中…' : 'ログイン'}
        </button>
      </form>
      <p>パスワードを忘れた場合は、管理者に仮パスワードの設定を依頼してください。</p>
      <p>
        <Link to="/signup">新規登録はこちら</Link>
      </p>
    </>
  );
}

export function SignupPage() {
  usePageTitle('新規登録');
  const { configured } = useAppData();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const invalid = validateDisplayName(name);
    if (invalid) return setError(invalid);
    if (password.length < 8) return setError('パスワードは8文字以上で入力してください。');
    if (password !== confirmation) return setError('確認用パスワードが一致しません。');
    if (!supabase) return;
    setBusy(true);
    const result = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { display_name: name.trim() } }
    });
    setBusy(false);
    if (result.error) return setError(result.error.message);
    navigate('/pending', { replace: true });
  };
  return (
    <>
      <p className="kicker">アカウント</p>
      <h1>新規登録</h1>
      <p>登録後、管理者の承認で掲示板を利用できます。</p>
      <form className="panel form-panel" onSubmit={submit}>
        <label>
          表示名
          <input
            value={name}
            maxLength={20}
            onChange={(e) => setName(e.target.value)}
            autoComplete="nickname"
            required
          />
        </label>
        <label>
          メールアドレス
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>
        <label>
          パスワード（8文字以上）
          <input
            type={show ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label>
          パスワード（確認）
          <input
            type={show ? 'text' : 'password'}
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
            autoComplete="new-password"
            required
          />
        </label>
        <label className="inline-check">
          <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
          表示する
        </label>
        {error && <p className="error">{error}</p>}
        <button className="button" disabled={!configured || busy}>
          {busy ? '登録中…' : '登録する'}
        </button>
      </form>
      <p>
        <Link to="/login">ログインへ</Link>
      </p>
    </>
  );
}

export function PendingPage() {
  usePageTitle('承認待ち');
  const { profile, refreshSession } = useAppData();
  const navigate = useNavigate();
  if (profile?.role && profile.role !== 'pending')
    return <Navigate to={destination(profile.role, '/board')} replace />;
  return (
    <>
      <p className="kicker">アカウント</p>
      <h1>承認待ち</h1>
      <p>登録ありがとうございます。管理者の承認をお待ちください。</p>
      <div className="button-row">
        <button className="button-secondary" onClick={() => void refreshSession()}>
          状態を更新
        </button>
        <button
          className="button"
          onClick={async () => {
            await supabase?.auth.signOut();
            navigate('/');
          }}
        >
          ログアウト
        </button>
      </div>
    </>
  );
}

export function SuspendedPage() {
  usePageTitle('利用停止中');
  const { profile } = useAppData();
  if (profile?.role && profile.role !== 'suspended')
    return <Navigate to={destination(profile.role, '/board')} replace />;
  return (
    <>
      <p className="kicker">アカウント</p>
      <h1>利用停止中</h1>
      <p>このアカウントは利用停止中です。管理者にお問い合わせください。</p>
    </>
  );
}
