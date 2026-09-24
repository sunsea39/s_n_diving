import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { joinStatusMessage, validateDisplayName } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';
import { supabase } from '../lib/supabase';

export function JoinPage() {
  usePageTitle('合言葉');
  const { configured, refreshSession } = useAppData();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [name, setName] = useState(() => localStorage.getItem('sn-diving-name') ?? '');
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    const invalid = validateDisplayName(name);
    if (invalid) return setError(invalid);
    if (!passcode) return setError('合言葉を入力してください。');
    if (!supabase) return setError('Supabase が未設定です。');

    setBusy(true);
    const session = await supabase.auth.getSession();
    if (!session.data.session) {
      const result = await supabase.auth.signInAnonymously();
      if (result.error) {
        setBusy(false);
        return setError(result.error.message);
      }
    }

    const profile = await supabase.auth.updateUser({ data: { display_name: name.trim() } });
    if (profile.error) {
      setBusy(false);
      return setError(profile.error.message);
    }

    const result = await supabase.rpc('join_board', { p_passcode: passcode });
    setBusy(false);
    if (result.error) return setError(result.error.message);

    const message = joinStatusMessage(result.data);
    if (message) return setError(message);

    localStorage.setItem('sn-diving-name', name.trim());
    await refreshSession();
    const next = params.get('next');
    navigate(next?.startsWith('/board') ? next : '/board');
  };

  return (
    <>
      <p className="kicker">掲示板</p>
      <h1>合言葉を入力</h1>
      <p>掲示板は仲間内専用です。表示名はこの端末にだけ保存されます。</p>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="form-grid">
          <label>
            表示名
            <input
              maxLength={20}
              value={name}
              onChange={(event) => setName(event.target.value)}
              autoComplete="nickname"
            />
          </label>
          <label>
            合言葉
            <input
              type="password"
              value={passcode}
              onChange={(event) => setPasscode(event.target.value)}
              autoComplete="current-password"
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="button-row">
          <button className="button" disabled={!configured || busy}>
            {busy ? '確認中…' : '掲示板に入る'}
          </button>
          <Link className="button-secondary" to="/more">
            その他へ
          </Link>
        </div>
      </form>
    </>
  );
}
