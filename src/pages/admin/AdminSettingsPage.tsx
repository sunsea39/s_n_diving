import { useEffect, useState } from 'react';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';

export function AdminSettingsPage() {
  usePageTitle('設定');
  const [disclaimer, setDisclaimer] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  useEffect(() => {
    void requireSupabase()
      .from('public_settings')
      .select('disclaimer')
      .single()
      .then(({ data }) => setDisclaimer(data?.disclaimer ?? ''));
  }, []);
  const save = async () => {
    setError('');
    const result = await requireSupabase().rpc('set_disclaimer', { p_disclaimer: disclaimer });
    if (result.error) setError(result.error.message);
    else setMessage('注意書きを保存しました。');
  };
  return (
    <>
      <p className="kicker">設定</p>
      <h1>表示の設定</h1>
      <div className="panel form-panel">
        <h2>注意書き文言</h2>
        <label>
          資料詳細の注意書き
          <textarea value={disclaimer} onChange={(event) => setDisclaimer(event.target.value)} />
        </label>
        <button className="button" onClick={() => void save()}>
          保存する
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </>
  );
}
