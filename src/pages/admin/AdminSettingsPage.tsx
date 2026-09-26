import { useEffect, useState } from 'react';
import { usePageTitle } from '../../lib/pageTitle';
import { validatePasscode } from '../../lib/logic';
import { requireSupabase } from '../../lib/supabase';

interface AdminRow {
  user_id: string;
  display_name: string;
  role: string;
}

export function AdminSettingsPage() {
  usePageTitle('設定');
  const [passcode, setPasscode] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPasscode, setShowPasscode] = useState(false);
  const [passcodeIsSet, setPasscodeIsSet] = useState<boolean | null>(null);
  const [disclaimer, setDisclaimer] = useState('');
  const [admins, setAdmins] = useState<AdminRow[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const client = requireSupabase();
    void Promise.all([
      client.from('public_settings').select('disclaimer').single(),
      client.from('admins').select('user_id, display_name, role').order('created_at'),
      client.rpc('passcode_is_set')
    ]).then(([settings, adminResult, passcodeResult]) => {
      if (settings.data) setDisclaimer(settings.data.disclaimer ?? '');
      if (adminResult.data) setAdmins(adminResult.data as AdminRow[]);
      if (!passcodeResult.error) setPasscodeIsSet(Boolean(passcodeResult.data));
    });
  }, []);

  const changePasscode = async () => {
    setError('');
    setMessage('');
    const invalid = validatePasscode(passcode);
    if (invalid) return setError(invalid);
    if (passcode !== confirmation) return setError('確認用の合言葉が一致しません。');

    const result = await requireSupabase().rpc('set_passcode', { p_passcode: passcode });
    if (result.error) {
      setError(result.error.message);
      return;
    }
    setPasscode('');
    setConfirmation('');
    setPasscodeIsSet(true);
    setMessage('合言葉を変更しました。掲示板メンバーは再入力が必要です。');
  };

  const saveDisclaimer = async () => {
    setError('');
    setMessage('');
    const result = await requireSupabase().rpc('set_disclaimer', { p_disclaimer: disclaimer });
    if (result.error) setError(result.error.message);
    else setMessage('注意書きを保存しました。');
  };

  return (
    <>
      <p className="kicker">設定</p>
      <h1>掲示板と表示の設定</h1>
      <div className="panel form-panel">
        <h2>合言葉を変更</h2>
        <p>変更すると、全員が新しい合言葉を入力するまで掲示板を利用できなくなります。</p>
        {passcodeIsSet === false && (
          <p className="warning">現在、合言葉は未設定です。掲示板には誰も入れません。</p>
        )}
        <label>
          新しい合言葉（8文字以上）
          <input
            id="new-passcode"
            type={showPasscode ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="8文字以上"
            minLength={8}
            value={passcode}
            onChange={(event) => setPasscode(event.target.value)}
          />
        </label>
        <label>
          新しい合言葉（確認）
          <input
            id="new-passcode-confirmation"
            type={showPasscode ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="もう一度入力"
            minLength={8}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
          />
        </label>
        <label className="inline-check">
          <input
            type="checkbox"
            checked={showPasscode}
            onChange={(event) => setShowPasscode(event.target.checked)}
          />
          表示する
        </label>
        <div className="button-row">
          <button className="button-danger" onClick={() => void changePasscode()}>
            合言葉を変更
          </button>
        </div>
      </div>
      <div className="panel form-panel">
        <h2>注意書き文言</h2>
        <label>
          資料詳細の注意書き
          <textarea value={disclaimer} onChange={(event) => setDisclaimer(event.target.value)} />
        </label>
        <div className="button-row">
          <button className="button" onClick={() => void saveDisclaimer()}>
            保存する
          </button>
        </div>
      </div>
      <section>
        <h2>管理者一覧</h2>
        <div className="admin-list">
          {admins.map((admin) => (
            <div className="panel" key={admin.user_id}>
              <b>{admin.display_name || '表示名未設定'}</b>
              <span className="meta"> ・ {admin.role}</span>
            </div>
          ))}
        </div>
      </section>
      {error && <p className="error">{error}</p>}
      {message && <p className="success">{message}</p>}
    </>
  );
}
