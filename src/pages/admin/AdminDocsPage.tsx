import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DocContent } from '../../components/DocContent';
import { useAppData } from '../../context/AppDataContext';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import type { DivingDoc, DocBody, EquipmentSection, Habit, Sign } from '../../types';

const icons = ['regulator', 'hose', 'bcd', 'computer', 'mask', 'fin', 'wetsuit', 'tank'];

const blankDoc = (): DivingDoc => ({
  slug: '',
  title: '',
  category: '機材',
  summary: '',
  icon: 'mask',
  status: 'draft',
  sort_order: 0,
  body: { intro: '', sections: [], habits: [], disclaimer: '' }
});

const blankSection = (no: number): EquipmentSection => ({
  no,
  name: '',
  sub: '',
  icon: 'mask',
  guideline: '',
  signs: []
});

function move<T>(items: T[], index: number, direction: -1 | 1): T[] {
  const target = index + direction;
  if (target < 0 || target >= items.length) return items;
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

function IconSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {icons.map((icon) => (
        <option value={icon} key={icon}>
          {icon}
        </option>
      ))}
    </select>
  );
}

function SignEditor({
  signs,
  changeSigns
}: {
  signs: Sign[];
  changeSigns: (signs: Sign[]) => void;
}) {
  const update = (index: number, patch: Partial<Sign>) => {
    changeSigns(
      signs.map((sign, itemIndex) => (itemIndex === index ? { ...sign, ...patch } : sign))
    );
  };

  return (
    <div className="editor-group">
      <h3>症状</h3>
      {signs.map((sign, index) => (
        <div className="editor-group" key={`${sign.sign}-${index}`}>
          <div className="form-grid">
            <label>
              重要度
              <select
                value={sign.level}
                onChange={(event) => update(index, { level: event.target.value as Sign['level'] })}
              >
                <option value="stop">赤：即中止</option>
                <option value="check">黄：早めに点検</option>
              </select>
            </label>
            <label>
              症状
              <input
                value={sign.sign}
                onChange={(event) => update(index, { sign: event.target.value })}
              />
            </label>
            <label>
              理由
              <textarea
                value={sign.why}
                onChange={(event) => update(index, { why: event.target.value })}
              />
            </label>
          </div>
          <div className="editor-row">
            <button onClick={() => changeSigns(move(signs, index, -1))}>上へ</button>
            <button onClick={() => changeSigns(move(signs, index, 1))}>下へ</button>
            <button
              className="remove"
              onClick={() => changeSigns(signs.filter((_, itemIndex) => itemIndex !== index))}
            >
              削除
            </button>
          </div>
        </div>
      ))}
      <button
        className="button-secondary"
        onClick={() => changeSigns([...signs, { level: 'check', sign: '', why: '' }])}
      >
        症状を追加
      </button>
    </div>
  );
}

function SectionEditor({
  sections,
  changeSections
}: {
  sections: EquipmentSection[];
  changeSections: (sections: EquipmentSection[]) => void;
}) {
  const update = (index: number, patch: Partial<EquipmentSection>) => {
    changeSections(
      sections.map((section, itemIndex) =>
        itemIndex === index ? { ...section, ...patch } : section
      )
    );
  };

  return (
    <section className="editor-group">
      <h3>機材セクション</h3>
      {sections.map((section, index) => (
        <div className="editor-group" key={`${section.no}-${index}`}>
          <div className="form-grid">
            <label>
              機材名
              <input
                value={section.name}
                onChange={(event) => update(index, { name: event.target.value })}
              />
            </label>
            <label>
              サブタイトル
              <input
                value={section.sub}
                onChange={(event) => update(index, { sub: event.target.value })}
              />
            </label>
            <label>
              イラスト
              <IconSelect value={section.icon} onChange={(icon) => update(index, { icon })} />
            </label>
            <label>
              交換・点検の目安
              <textarea
                value={section.guideline}
                onChange={(event) => update(index, { guideline: event.target.value })}
              />
            </label>
          </div>
          <SignEditor signs={section.signs} changeSigns={(signs) => update(index, { signs })} />
          <div className="editor-row">
            <button onClick={() => changeSections(move(sections, index, -1))}>上へ</button>
            <button onClick={() => changeSections(move(sections, index, 1))}>下へ</button>
            <button
              className="remove"
              onClick={() =>
                changeSections(
                  sections
                    .filter((_, itemIndex) => itemIndex !== index)
                    .map((item, itemIndex) => ({ ...item, no: itemIndex + 1 }))
                )
              }
            >
              削除
            </button>
          </div>
        </div>
      ))}
      <button
        className="button-secondary"
        onClick={() => changeSections([...sections, blankSection(sections.length + 1)])}
      >
        機材を追加
      </button>
    </section>
  );
}

function HabitEditor({
  habits,
  changeHabits
}: {
  habits: Habit[];
  changeHabits: (habits: Habit[]) => void;
}) {
  const update = (index: number, patch: Partial<Habit>) => {
    changeHabits(
      habits.map((habit, itemIndex) => (itemIndex === index ? { ...habit, ...patch } : habit))
    );
  };

  return (
    <section className="editor-group">
      <h3>機材を長持ちさせる習慣</h3>
      {habits.map((habit, index) => (
        <div className="editor-group" key={`${habit.title}-${index}`}>
          <div className="form-grid">
            <label>
              見出し
              <input
                value={habit.title}
                onChange={(event) => update(index, { title: event.target.value })}
              />
            </label>
            <label>
              本文
              <textarea
                value={habit.text}
                onChange={(event) => update(index, { text: event.target.value })}
              />
            </label>
          </div>
          <div className="editor-row">
            <button onClick={() => changeHabits(move(habits, index, -1))}>上へ</button>
            <button onClick={() => changeHabits(move(habits, index, 1))}>下へ</button>
            <button
              className="remove"
              onClick={() => changeHabits(habits.filter((_, itemIndex) => itemIndex !== index))}
            >
              削除
            </button>
          </div>
        </div>
      ))}
      <button
        className="button-secondary"
        onClick={() => changeHabits([...habits, { title: '', text: '' }])}
      >
        習慣を追加
      </button>
    </section>
  );
}

export function AdminDocsListPage() {
  usePageTitle('資料管理');
  const [docs, setDocs] = useState<DivingDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void requireSupabase()
      .from('docs')
      .select('*')
      .order('sort_order')
      .then(({ data }) => {
        setDocs((data ?? []) as DivingDoc[]);
        setLoading(false);
      });
  }, []);

  return (
    <>
      <div className="section-heading">
        <div>
          <p className="kicker">資料</p>
          <h1>資料を管理</h1>
        </div>
        <Link className="button" to="/admin/docs/new">
          資料を作成
        </Link>
      </div>
      {loading ? (
        <p>読み込み中です…</p>
      ) : (
        <div className="admin-list">
          {docs.map((doc) => (
            <Link className="panel news-row" key={doc.id} to={`/admin/docs/${doc.id}`}>
              <span className="meta">
                {doc.status === 'published' ? '公開中' : '下書き'} ・ 並び順 {doc.sort_order}
              </span>
              <b>{doc.title}</b>
              <span>{doc.slug}</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}

export function AdminDocEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshPublic } = useAppData();
  const [doc, setDoc] = useState<DivingDoc>(blankDoc);
  const [loading, setLoading] = useState(Boolean(id));
  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState('');
  usePageTitle(id ? '資料編集' : '資料作成');

  useEffect(() => {
    if (!id) return;
    void requireSupabase()
      .from('docs')
      .select('*')
      .eq('id', id)
      .single()
      .then(({ data, error: loadError }) => {
        if (loadError || !data) setError(loadError?.message ?? '資料が見つかりません。');
        else setDoc(data as DivingDoc);
        setLoading(false);
      });
  }, [id]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const intercept = (event: MouseEvent) => {
      const link = (event.target as Element).closest('a');
      if (link && !window.confirm('未保存の変更があります。ページを移動しますか？')) {
        event.preventDefault();
        event.stopImmediatePropagation();
      }
    };
    window.addEventListener('beforeunload', warn);
    document.addEventListener('click', intercept, true);
    return () => {
      window.removeEventListener('beforeunload', warn);
      document.removeEventListener('click', intercept, true);
    };
  }, [dirty]);

  const change = <K extends keyof DivingDoc>(key: K, value: DivingDoc[K]) => {
    setDoc((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const changeBody = (patch: Partial<DocBody>) => {
    setDoc((current) => ({ ...current, body: { ...current.body, ...patch } }));
    setDirty(true);
  };

  const save = async () => {
    setError('');
    if (!doc.title.trim() || !doc.slug.trim())
      return setError('タイトルと slug を入力してください。');
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(doc.slug)) {
      return setError('slug は半角英数とハイフンで入力してください。');
    }

    const { id: docId, ...payload } = doc;
    const client = requireSupabase();
    const result = docId
      ? await client.from('docs').update(payload).eq('id', docId).select().single()
      : await client.from('docs').insert(payload).select().single();
    if (result.error) return setError(result.error.message);

    setDoc(result.data as DivingDoc);
    setDirty(false);
    setSaved('保存しました。');
    await refreshPublic();
    if (!docId) navigate(`/admin/docs/${result.data.id}`, { replace: true });
  };

  if (loading) return <p>読み込み中です…</p>;

  return (
    <>
      <p className="kicker">資料</p>
      <h1>{id ? '資料を編集' : '資料を作成'}</h1>
      <div className="editor-tabs">
        <button className={tab === 'form' ? 'active' : ''} onClick={() => setTab('form')}>
          編集
        </button>
        <button className={tab === 'preview' ? 'active' : ''} onClick={() => setTab('preview')}>
          プレビュー
        </button>
      </div>
      {tab === 'preview' ? (
        <DocContent doc={doc} preview />
      ) : (
        <div className="panel form-panel">
          <div className="form-grid">
            <label>
              タイトル
              <input value={doc.title} onChange={(event) => change('title', event.target.value)} />
            </label>
            <label>
              slug
              <input value={doc.slug} onChange={(event) => change('slug', event.target.value)} />
              <span className="field-help">半角英数とハイフン</span>
            </label>
            <label>
              カテゴリ
              <input
                value={doc.category}
                onChange={(event) => change('category', event.target.value)}
              />
            </label>
            <label>
              概要
              <textarea
                value={doc.summary}
                onChange={(event) => change('summary', event.target.value)}
              />
            </label>
            <label>
              一覧用アイコン
              <IconSelect value={doc.icon ?? 'mask'} onChange={(icon) => change('icon', icon)} />
            </label>
            <label>
              状態
              <select
                value={doc.status}
                onChange={(event) => change('status', event.target.value as DivingDoc['status'])}
              >
                <option value="draft">下書き</option>
                <option value="published">公開</option>
              </select>
            </label>
            <label>
              並び順
              <input
                type="number"
                value={doc.sort_order}
                onChange={(event) => change('sort_order', Number(event.target.value))}
              />
            </label>
            <label>
              intro
              <textarea
                value={doc.body.intro}
                onChange={(event) => changeBody({ intro: event.target.value })}
              />
            </label>
          </div>
          <SectionEditor
            sections={doc.body.sections}
            changeSections={(sections) => changeBody({ sections })}
          />
          <HabitEditor habits={doc.body.habits} changeHabits={(habits) => changeBody({ habits })} />
          <label>
            注意書き
            <textarea
              value={doc.body.disclaimer}
              onChange={(event) => changeBody({ disclaimer: event.target.value })}
            />
          </label>
          {error && <p className="error">{error}</p>}
          {saved && <p className="success">{saved}</p>}
          <div className="button-row">
            <button className="button" onClick={() => void save()}>
              保存する
            </button>
            <Link className="button-secondary" to="/admin/docs">
              一覧に戻る
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
