import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { boardCategories, uploadBoardImage } from '../../lib/board';
import { validateThreadInput } from '../../lib/logic';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import type { BoardCategory, HiyariFields } from '../../types';

export function NewThreadPage() {
  usePageTitle('新規投稿');
  const navigate = useNavigate();
  const { user, profile } = useAppData();
  const [category, setCategory] = useState<BoardCategory>('hiyari');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [hiyari, setHiyari] = useState<HiyariFields>({ what: '', why: '', next: '' });
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const invalid = validateThreadInput({ title, body, category, hiyari });
    if (invalid) return setError(invalid);
    if (!user) return setError('セッションを確認できません。もう一度お試しください。');

    setBusy(true);
    setError('');
    try {
      const image_path = file ? await uploadBoardImage(file, user.id) : null;
      const result = await requireSupabase()
        .from('threads')
        .insert({
          category,
          title: title.trim(),
          body: category === 'hiyari' ? '' : body.trim(),
          hiyari: category === 'hiyari' ? hiyari : null,
          image_path,
          author_name: profile?.display_name ?? '名無し',
          author_uid: user.id
        })
        .select()
        .single();
      if (result.error) throw result.error;
      navigate(`/board/${result.data.id}`);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : '投稿できませんでした。');
    } finally {
      setBusy(false);
    }
  };

  const hiyariField = (key: keyof HiyariFields, label: string) => (
    <label>
      {label}
      <textarea
        value={hiyari[key]}
        maxLength={4000}
        onChange={(event) => setHiyari({ ...hiyari, [key]: event.target.value })}
      />
    </label>
  );

  return (
    <>
      <p className="kicker">掲示板</p>
      <h1>新規投稿</h1>
      <form className="panel form-panel" onSubmit={submit}>
        <div className="form-grid">
          <label>
            カテゴリ
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value as BoardCategory)}
            >
              {boardCategories.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            タイトル
            <input
              value={title}
              maxLength={60}
              onChange={(event) => setTitle(event.target.value)}
            />
            <span className="field-help">60文字まで</span>
          </label>
          {category === 'hiyari' ? (
            <>
              {hiyariField('what', '何が起きた？')}
              {hiyariField('why', 'なぜ起きた？')}
              {hiyariField('next', '次はどうする？')}
            </>
          ) : (
            <label>
              本文
              <textarea
                value={body}
                maxLength={4000}
                onChange={(event) => setBody(event.target.value)}
              />
              <span className="field-help">4000文字まで</span>
            </label>
          )}
          <label>
            画像（1枚まで・JPEGに縮小してアップロード）
            <input
              className="file-input"
              type="file"
              accept="image/*"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        <div className="button-row">
          <button className="button" disabled={busy}>
            {busy ? '投稿中…' : '投稿する'}
          </button>
          <Link className="button-secondary" to="/board">
            戻る
          </Link>
        </div>
      </form>
    </>
  );
}
