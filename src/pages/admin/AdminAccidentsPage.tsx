import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AccidentCard } from '../AccidentsPage';
import { useAppData } from '../../context/AppDataContext';
import { accidentOutcomes, reorder, validateSlug } from '../../lib/logic';
import {
  decodeAccidentCsv,
  previewAccidentCsv,
  type AccidentCsvPreview
} from '../../lib/accidentCsv';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import type { Accident, AccidentOutcome, AccidentSource, AccidentTimelineItem } from '../../types';

const tags = [
  'エア切れ',
  '急浮上',
  '漂流',
  '機材トラブル',
  '体調・持病',
  '減圧症',
  'バディ離れ',
  '視界不良',
  '海況',
  '海洋生物',
  'その他',
  '不明'
];
const emptyAccident = (): Accident => ({
  id: '',
  slug: '',
  title: '',
  occurred_on: null,
  occurred_label: '',
  location: '',
  dive_style: '',
  outcome: 'near_miss',
  tags: [],
  summary: '',
  timeline: [],
  causes: [],
  lessons: [],
  related_doc_slugs: [],
  sources: [],
  status: 'draft'
});

function AccidentCsvImport({ onImported }: { onImported: () => Promise<void> }) {
  const { refreshPublic } = useAppData();
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<AccidentCsvPreview | null>(null);
  const [excludeErrors, setExcludeErrors] = useState(false);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState('');

  const readFile = async (file: File | undefined) => {
    setResult('');
    if (!file) return;
    if (file.size > 1024 * 1024) {
      setPreview({ rows: [], errors: ['CSV は 1 MB 以下にしてください。'], encoding: 'UTF-8' });
      return;
    }
    try {
      const { text, encoding } = decodeAccidentCsv(await file.arrayBuffer());
      const records = previewAccidentCsv(text, {
        existingSlugs: [],
        documentSlugs: [],
        encoding
      });
      if (records.errors.length) {
        setPreview(records);
        return;
      }
      if (records.rows.length > 200) {
        setPreview({ ...records, rows: [], errors: ['CSV は 200 行以下にしてください。'] });
        return;
      }
      const client = requireSupabase();
      const [accidentResult, documentResult] = await Promise.all([
        client.from('accidents').select('slug'),
        client.from('docs').select('slug')
      ]);
      setPreview(
        previewAccidentCsv(text, {
          existingSlugs: (accidentResult.data ?? []).map((item) => item.slug as string),
          documentSlugs: (documentResult.data ?? []).map((item) => item.slug as string),
          encoding
        })
      );
    } catch (cause) {
      setPreview({
        rows: [],
        errors: [cause instanceof Error ? cause.message : 'CSV を読み込めませんでした。'],
        encoding: 'UTF-8'
      });
    }
  };

  const importRows = async () => {
    if (!preview) return;
    const errorRows = preview.rows.filter((row) => row.action === 'error');
    if (errorRows.length && !excludeErrors) return;
    const rows = preview.rows.filter((row) => row.accident);
    setBusy(true);
    let created = 0;
    let updated = 0;
    let failed = 0;
    for (const row of rows) {
      const response = await requireSupabase()
        .from('accidents')
        .upsert(row.accident!, { onConflict: 'slug' });
      if (response.error) failed += 1;
      else if (row.action === 'update') updated += 1;
      else created += 1;
    }
    setBusy(false);
    setResult(`取り込み完了：新規 ${created} 件・更新 ${updated} 件・失敗 ${failed} 件`);
    if (created || updated) {
      await onImported();
      await refreshPublic();
    }
  };

  const errors = preview?.rows.filter((row) => row.action === 'error').length ?? 0;
  const importable = preview?.rows.filter((row) => row.accident).length ?? 0;
  return (
    <section className="panel form-panel csv-import">
      <h2>CSV で取り込む</h2>
      <p className="notice">
        当事者の氏名や個人を特定できる情報は入力しないでください。報道・公的報告書は自分の言葉で要約し、出典をリンクしてください。
      </p>
      <p>
        <a href={import.meta.env.BASE_URL + 'templates/accidents-template.csv'} download>
          テンプレートをダウンロード
        </a>{' '}
        （見出し名で列を対応づけます。順番は変えられます）
      </p>
      <p className="meta">
        発生日は YYYY-MM-DD、結果は
        死亡／重症／軽症／ヒヤリ、タグは「、」「,」「／」区切り、出典は「ラベル |
        https://…」です。空欄の公開状態は下書きになります。
      </p>
      <input
        ref={input}
        className="file-input"
        type="file"
        accept=".csv,text/csv"
        onChange={(event) => void readFile(event.target.files?.[0])}
      />
      <div
        className="csv-dropzone"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          void readFile(event.dataTransfer.files[0]);
        }}
      >
        CSV をここへドラッグ＆ドロップ
      </div>
      {preview?.errors.map((error) => (
        <p className="error" key={error}>
          {error}
        </p>
      ))}
      {preview && !preview.errors.length && (
        <>
          <p className="meta">
            文字コード：{preview.encoding} ／ {preview.rows.length} 行
          </p>
          <div className="admin-table-scroll csv-preview">
            <table>
              <thead>
                <tr>
                  <th>行</th>
                  <th>判定</th>
                  <th>slug</th>
                  <th>タイトル</th>
                  <th>内容</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr
                    key={row.line}
                    className={row.action === 'error' ? 'csv-error-row' : undefined}
                  >
                    <td>{row.line}</td>
                    <td>
                      {row.action === 'new' ? '新規' : row.action === 'update' ? '更新' : 'エラー'}
                    </td>
                    <td>{row.accident?.slug ?? '—'}</td>
                    <td>{row.accident?.title ?? '—'}</td>
                    <td>{[...row.messages, ...row.warnings].join(' / ') || '確認済み'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {errors > 0 && (
            <label className="csv-exclude">
              <input
                type="checkbox"
                checked={excludeErrors}
                onChange={(event) => setExcludeErrors(event.target.checked)}
              />
              エラーの {errors} 行を除外して取り込む
            </label>
          )}
          <button
            className="button"
            disabled={busy || !importable || (errors > 0 && !excludeErrors)}
            onClick={() => void importRows()}
          >
            {busy ? '取り込み中…' : `${importable} 件を取り込む`}
          </button>
        </>
      )}
      {result && <p className="success">{result}</p>}
    </section>
  );
}
function Controls<T>({
  items,
  index,
  onChange
}: {
  items: T[];
  index: number;
  onChange: (items: T[]) => void;
}) {
  return (
    <span className="editor-row">
      <button onClick={() => onChange(reorder(items, index, -1))}>上へ</button>
      <button onClick={() => onChange(reorder(items, index, 1))}>下へ</button>
      <button className="remove" onClick={() => onChange(items.filter((_, i) => i !== index))}>
        削除
      </button>
    </span>
  );
}
function StringRows({
  title,
  items,
  onChange
}: {
  title: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  return (
    <section className="editor-group">
      <h3>{title}</h3>
      {items.map((item, index) => (
        <div className="editor-row" key={index}>
          <input
            value={item}
            onChange={(event) =>
              onChange(items.map((value, i) => (i === index ? event.target.value : value)))
            }
          />
          <Controls items={items} index={index} onChange={onChange} />
        </div>
      ))}
      <button className="button-secondary" onClick={() => onChange([...items, ''])}>
        行を追加
      </button>
    </section>
  );
}
export function AdminAccidentsListPage() {
  usePageTitle('事故事例管理');
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [showImport, setShowImport] = useState(false);
  const load = async () => {
    const { data } = await requireSupabase()
      .from('accidents')
      .select('*')
      .order('occurred_on', { ascending: false });
    setAccidents((data ?? []) as Accident[]);
  };
  useEffect(() => {
    void load();
  }, []);
  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">事故事例</p>
          <h1>事故事例を管理</h1>
        </div>
        <div className="button-row">
          <button className="button-secondary" onClick={() => setShowImport((visible) => !visible)}>
            CSV で取り込む
          </button>
          <Link className="button" to="/admin/accidents/new">
            事故事例を作成
          </Link>
        </div>
      </div>
      {showImport && <AccidentCsvImport onImported={load} />}
      <div className="admin-list">
        {accidents.map((accident) => (
          <Link className="panel news-row" to={'/admin/accidents/' + accident.id} key={accident.id}>
            <span className="meta">
              {accident.status === 'published' ? '公開中' : '下書き'} ・{' '}
              {accident.occurred_label || accident.occurred_on || '時期不明'}
            </span>
            <b>{accident.title}</b>
          </Link>
        ))}
      </div>
    </>
  );
}
export function AdminAccidentEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { docs, refreshPublic } = useAppData();
  const [item, setItem] = useState<Accident>(emptyAccident);
  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  usePageTitle(id ? '事故事例編集' : '事故事例作成');
  useEffect(() => {
    if (!id) return;
    void requireSupabase()
      .from('accidents')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError || !data) setError(loadError?.message ?? '事故事例が見つかりません。');
        else setItem(data as Accident);
      });
  }, [id]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  const change = <K extends keyof Accident>(key: K, value: Accident[K]) => {
    setItem((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const save = async () => {
    setError('');
    const slugError = validateSlug(item.slug);
    if (!item.title.trim() || !item.summary.trim() || slugError)
      return setError(
        !item.title.trim() || !item.summary.trim()
          ? 'タイトルと概要を入力してください。'
          : (slugError ?? 'slug を確認してください。')
      );
    const { id: ignored, ...payload } = item;
    void ignored;
    const client = requireSupabase();
    const result = id
      ? await client.from('accidents').update(payload).eq('id', id).select().single()
      : await client.from('accidents').insert(payload).select().single();
    if (result.error) return setError(result.error.message ?? '保存できませんでした。');
    setItem(result.data as Accident);
    setDirty(false);
    await refreshPublic();
    if (!id) navigate('/admin/accidents/' + result.data.id, { replace: true });
  };
  if (tab === 'preview')
    return (
      <>
        <div className="editor-tabs">
          <button onClick={() => setTab('form')}>編集</button>
          <button className="active">プレビュー</button>
        </div>
        <AccidentCard accident={item} />
      </>
    );
  return (
    <>
      <p className="kicker">事故事例</p>
      <h1>{id ? '事故事例を編集' : '事故事例を作成'}</h1>
      <p className="notice">
        報道・公的報告書は自分の言葉で要約し、出典をリンクしてください。当事者の氏名や個人を特定できる情報は入力しないでください。
      </p>
      <div className="editor-tabs">
        <button className="active">編集</button>
        <button onClick={() => setTab('preview')}>プレビュー</button>
      </div>
      <div className="panel form-panel">
        <div className="form-grid">
          <label>
            タイトル
            <input value={item.title} onChange={(event) => change('title', event.target.value)} />
          </label>
          <label>
            slug
            <input value={item.slug} onChange={(event) => change('slug', event.target.value)} />
          </label>
          <label>
            発生日
            <input
              type="date"
              value={item.occurred_on ?? ''}
              onChange={(event) => change('occurred_on', event.target.value || null)}
            />
          </label>
          <label>
            表示用の発生時期
            <input
              placeholder="2024年7月"
              value={item.occurred_label}
              onChange={(event) => change('occurred_label', event.target.value)}
            />
          </label>
          <label>
            場所
            <input
              value={item.location}
              onChange={(event) => change('location', event.target.value)}
            />
          </label>
          <label>
            ダイビングスタイル
            <input
              placeholder="ボート / ビーチ / ドリフト / ナイト / その他"
              value={item.dive_style}
              onChange={(event) => change('dive_style', event.target.value)}
            />
          </label>
          <label>
            結果
            <select
              value={item.outcome}
              onChange={(event) => change('outcome', event.target.value as AccidentOutcome)}
            >
              {accidentOutcomes.map((outcome) => (
                <option value={outcome.value} key={outcome.value}>
                  {outcome.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            状態
            <select
              value={item.status}
              onChange={(event) => change('status', event.target.value as Accident['status'])}
            >
              <option value="draft">下書き</option>
              <option value="published">公開</option>
            </select>
          </label>
          <label>
            概要
            <textarea
              value={item.summary}
              onChange={(event) => change('summary', event.target.value)}
            />
          </label>
        </div>
        <section className="editor-group">
          <h3>タグ</h3>
          <div className="tag-checks">
            {tags.map((tag) => (
              <label key={tag}>
                <input
                  type="checkbox"
                  checked={item.tags.includes(tag)}
                  onChange={(event) =>
                    change(
                      'tags',
                      event.target.checked
                        ? [...item.tags, tag]
                        : item.tags.filter((value) => value !== tag)
                    )
                  }
                />
                {tag}
              </label>
            ))}
          </div>
        </section>
        <section className="editor-group">
          <h3>経過</h3>
          {item.timeline.map((entry, index) => (
            <div className="editor-group" key={index}>
              <label>
                時刻
                <input
                  value={entry.time}
                  onChange={(event) =>
                    change(
                      'timeline',
                      item.timeline.map((value, i) =>
                        i === index ? { ...value, time: event.target.value } : value
                      )
                    )
                  }
                />
              </label>
              <label>
                本文
                <textarea
                  value={entry.text}
                  onChange={(event) =>
                    change(
                      'timeline',
                      item.timeline.map((value, i) =>
                        i === index ? { ...value, text: event.target.value } : value
                      )
                    )
                  }
                />
              </label>
              <Controls
                items={item.timeline}
                index={index}
                onChange={(timeline) => change('timeline', timeline)}
              />
            </div>
          ))}
          <button
            className="button-secondary"
            onClick={() =>
              change('timeline', [...item.timeline, { time: '', text: '' } as AccidentTimelineItem])
            }
          >
            行を追加
          </button>
        </section>
        <StringRows
          title="考えられる原因"
          items={item.causes}
          onChange={(causes) => change('causes', causes)}
        />
        <StringRows
          title="防ぐためのポイント"
          items={item.lessons}
          onChange={(lessons) => change('lessons', lessons)}
        />
        <section className="editor-group">
          <h3>関連資料（公開中）</h3>
          {docs
            .filter((doc) => doc.status === 'published')
            .map((doc) => (
              <label key={doc.slug}>
                <input
                  type="checkbox"
                  checked={item.related_doc_slugs.includes(doc.slug)}
                  onChange={(event) =>
                    change(
                      'related_doc_slugs',
                      event.target.checked
                        ? [...item.related_doc_slugs, doc.slug]
                        : item.related_doc_slugs.filter((slug) => slug !== doc.slug)
                    )
                  }
                />
                {doc.title}
              </label>
            ))}
        </section>
        <section className="editor-group">
          <h3>出典</h3>
          {item.sources.map((source, index) => (
            <div className="editor-group" key={index}>
              <label>
                表示名
                <input
                  value={source.label}
                  onChange={(event) =>
                    change(
                      'sources',
                      item.sources.map((value, i) =>
                        i === index ? { ...value, label: event.target.value } : value
                      )
                    )
                  }
                />
              </label>
              <label>
                URL
                <input
                  type="url"
                  value={source.url}
                  onChange={(event) =>
                    change(
                      'sources',
                      item.sources.map((value, i) =>
                        i === index ? { ...value, url: event.target.value } : value
                      )
                    )
                  }
                />
              </label>
              <Controls
                items={item.sources}
                index={index}
                onChange={(sources) => change('sources', sources)}
              />
            </div>
          ))}
          <button
            className="button-secondary"
            onClick={() =>
              change('sources', [...item.sources, { label: '', url: '' } as AccidentSource])
            }
          >
            出典を追加
          </button>
        </section>
        {error && <p className="error">{error}</p>}
        <div className="button-row">
          <button className="button" onClick={() => void save()}>
            保存する
          </button>
          <Link className="button-secondary" to="/admin/accidents">
            一覧に戻る
          </Link>
        </div>
      </div>
    </>
  );
}
