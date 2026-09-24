import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAppData } from '../../context/AppDataContext';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import type { NewsItem } from '../../types';

interface NewsDraft {
  id?: string;
  title: string;
  body: string;
  next_dive_at: string;
  next_dive_place: string;
  pinned: boolean;
  published_at: string;
}

const blankNews = (): NewsDraft => ({
  title: '',
  body: '',
  next_dive_at: '',
  next_dive_place: '',
  pinned: false,
  published_at: new Date().toISOString().slice(0, 16)
});

export function AdminNewsListPage() {
  usePageTitle('お知らせ管理');
  const [items, setItems] = useState<NewsItem[]>([]);

  useEffect(() => {
    void requireSupabase()
      .from('news')
      .select('*')
      .order('pinned', { ascending: false })
      .order('published_at', { ascending: false })
      .then(({ data }) => setItems((data ?? []) as NewsItem[]));
  }, []);

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">お知らせ</p>
          <h1>お知らせを管理</h1>
        </div>
        <Link className="button" to="/admin/news/new">
          お知らせを作成
        </Link>
      </div>
      <div className="admin-list">
        {items.map((item) => (
          <Link className="panel news-row" key={item.id} to={`/admin/news/${item.id}`}>
            <span className="meta">
              {item.pinned && '固定 ・ '}
              {item.published_at
                ? new Date(item.published_at).toLocaleString('ja-JP')
                : '公開日時なし'}
            </span>
            <b>{item.title}</b>
          </Link>
        ))}
      </div>
    </>
  );
}

export function AdminNewsEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshPublic } = useAppData();
  const [item, setItem] = useState<NewsDraft>(blankNews);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  usePageTitle(id ? 'お知らせ編集' : 'お知らせ作成');

  useEffect(() => {
    if (!id) return;
    void requireSupabase()
      .from('news')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError || !data) {
          setError(loadError?.message ?? 'お知らせが見つかりません。');
          return;
        }
        const loaded = data as NewsItem;
        setItem({
          id: loaded.id,
          title: loaded.title,
          body: loaded.body,
          next_dive_at: loaded.next_dive_at ? loaded.next_dive_at.slice(0, 16) : '',
          next_dive_place: loaded.next_dive_place ?? '',
          pinned: loaded.pinned,
          published_at: loaded.published_at ? loaded.published_at.slice(0, 16) : ''
        });
      });
  }, [id]);

  const change = <K extends keyof NewsDraft>(key: K, value: NewsDraft[K]) => {
    setItem((current) => ({ ...current, [key]: value }));
  };

  const save = async () => {
    if (!item.title.trim() || !item.body.trim())
      return setError('タイトルと本文を入力してください。');

    const { id: itemId, next_dive_at, next_dive_place, published_at, ...rest } = item;
    const payload = {
      ...rest,
      next_dive_at: next_dive_at ? new Date(next_dive_at).toISOString() : null,
      next_dive_place: next_dive_place.trim() || null,
      published_at: published_at ? new Date(published_at).toISOString() : null
    };
    const client = requireSupabase();
    const result = itemId
      ? await client.from('news').update(payload).eq('id', itemId).select().single()
      : await client.from('news').insert(payload).select().single();
    if (result.error) return setError(result.error.message);

    setSaved('保存しました。');
    await refreshPublic();
    if (!itemId) navigate(`/admin/news/${result.data.id}`, { replace: true });
  };

  return (
    <>
      <p className="kicker">お知らせ</p>
      <h1>{id ? 'お知らせを編集' : 'お知らせを作成'}</h1>
      <div className="panel form-panel">
        <div className="form-grid">
          <label>
            タイトル
            <input
              maxLength={120}
              value={item.title}
              onChange={(event) => change('title', event.target.value)}
            />
          </label>
          <label>
            本文
            <textarea value={item.body} onChange={(event) => change('body', event.target.value)} />
          </label>
          <label>
            次回予定日時（任意）
            <input
              type="datetime-local"
              value={item.next_dive_at}
              onChange={(event) => change('next_dive_at', event.target.value)}
            />
          </label>
          <label>
            次回場所（任意）
            <input
              value={item.next_dive_place}
              onChange={(event) => change('next_dive_place', event.target.value)}
            />
          </label>
          <label>
            公開日時
            <input
              type="datetime-local"
              value={item.published_at}
              onChange={(event) => change('published_at', event.target.value)}
            />
          </label>
          <label>
            <input
              type="checkbox"
              checked={item.pinned}
              onChange={(event) => change('pinned', event.target.checked)}
            />
            固定表示する
          </label>
        </div>
        {error && <p className="error">{error}</p>}
        {saved && <p className="success">{saved}</p>}
        <div className="button-row">
          <button className="button" onClick={() => void save()}>
            保存する
          </button>
          <Link className="button-secondary" to="/admin/news">
            一覧に戻る
          </Link>
        </div>
      </div>
    </>
  );
}
