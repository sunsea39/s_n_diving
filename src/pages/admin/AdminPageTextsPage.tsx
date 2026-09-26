import { useEffect, useState } from 'react';
import { DEFAULT_PAGE_TEXTS } from '../../components/PageHeading';
import { requireSupabase } from '../../lib/supabase';
import type { PageText } from '../../types';

export function AdminPageTextsPage() {
  const [items, setItems] = useState<Record<string, Omit<PageText, 'key'>>>(DEFAULT_PAGE_TEXTS);
  const [message, setMessage] = useState('');
  useEffect(() => {
    void requireSupabase()
      .from('page_texts')
      .select('key,kicker,title,lead')
      .then(({ data }) =>
        setItems((current) => ({
          ...current,
          ...Object.fromEntries((data ?? []).map(({ key, ...value }) => [key, value]))
        }))
      );
  }, []);
  return (
    <>
      <p className="kicker">表示設定</p>
      <h1>ページの文言</h1>
      <div className="admin-list">
        {(Object.keys(DEFAULT_PAGE_TEXTS) as PageText['key'][]).map((key) => {
          const value = items[key];
          return (
            <section className="panel form-panel" key={key}>
              <h2>{key}</h2>
              <label>
                kicker
                <input
                  maxLength={40}
                  value={value.kicker}
                  onChange={(e) =>
                    setItems({ ...items, [key]: { ...value, kicker: e.target.value } })
                  }
                />
              </label>
              <label>
                title
                <input
                  maxLength={60}
                  value={value.title}
                  onChange={(e) =>
                    setItems({ ...items, [key]: { ...value, title: e.target.value } })
                  }
                />
              </label>
              <label>
                lead
                <textarea
                  maxLength={300}
                  value={value.lead}
                  onChange={(e) =>
                    setItems({ ...items, [key]: { ...value, lead: e.target.value } })
                  }
                />
              </label>
              <aside className="page-text-preview">
                <p className="kicker">{value.kicker}</p>
                <h3>{value.title}</h3>
                <p>{value.lead}</p>
              </aside>
              <button
                className="button"
                onClick={async () => {
                  const { error } = await requireSupabase()
                    .from('page_texts')
                    .upsert({ key, ...value });
                  setMessage(error ? error.message : '保存しました。');
                }}
              >
                保存
              </button>
            </section>
          );
        })}
      </div>
      {message && <p className="success">{message}</p>}
    </>
  );
}
