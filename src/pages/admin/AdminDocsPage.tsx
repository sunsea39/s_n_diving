import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { DocContent } from '../../components/DocContent';
import { useAppData } from '../../context/AppDataContext';
import { resizeToJpeg } from '../../lib/images';
import { normalizeDocBody, reorder, validateBlock, validateSlug } from '../../lib/logic';
import { usePageTitle } from '../../lib/pageTitle';
import { requireSupabase } from '../../lib/supabase';
import type { Block, DivingDoc, DocBody, EquipmentSection, Sign } from '../../types';

const icons = ['', 'regulator', 'hose', 'bcd', 'computer', 'mask', 'fin', 'wetsuit', 'tank'];
const makeSection = (no: number): EquipmentSection => ({
  no,
  name: '',
  sub: '',
  icon: 'mask',
  guideline: '',
  signs: []
});
const makeBlock = (type: Block['type']): Block => {
  if (type === 'heading') return { type, text: '' };
  if (type === 'text') return { type, text: '' };
  if (type === 'callout') return { type, tone: 'info', title: '', text: '' };
  if (type === 'signs') return { type, sections: [makeSection(1)] };
  if (type === 'cards') return { type, columns: 2, items: [{ title: '', text: '' }] };
  if (type === 'steps') return { type, items: [{ title: '', text: '' }] };
  if (type === 'checklist') return { type, title: '', items: [{ text: '', level: 'check' }] };
  if (type === 'table') return { type, headers: [''], rows: [['']] };
  if (type === 'image') return { type, src: '', alt: '', caption: '' };
  if (type === 'qa') return { type, items: [{ q: '', a: '' }] };
  return { type: 'links', items: [{ label: '', url: '' }] };
};
const templates: { label: string; blocks: Block[] }[] = [
  { label: '白紙', blocks: [] },
  { label: '機材チェック型', blocks: [makeBlock('signs'), makeBlock('cards')] },
  { label: '手順型', blocks: [makeBlock('text'), makeBlock('steps'), makeBlock('callout')] },
  { label: 'Q&A型', blocks: [makeBlock('text'), makeBlock('qa'), makeBlock('links')] },
  { label: 'チェックリスト型', blocks: [makeBlock('text'), makeBlock('checklist')] }
];
const blankDoc = (blocks: Block[] = []): DivingDoc => ({
  slug: '',
  title: '',
  category: '機材',
  summary: '',
  icon: 'mask',
  status: 'draft',
  sort_order: 0,
  body: { intro: '', blocks: structuredClone(blocks), disclaimer: '' }
});

function IconSelect({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {icons.map((icon) => (
        <option value={icon} key={icon}>
          {icon || 'アイコンなし（テキストのみ）'}
        </option>
      ))}
    </select>
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
function SignsEditor({
  sections,
  onChange
}: {
  sections: EquipmentSection[];
  onChange: (items: EquipmentSection[]) => void;
}) {
  const editSection = (index: number, patch: Partial<EquipmentSection>) =>
    onChange(sections.map((value, i) => (i === index ? { ...value, ...patch } : value)));
  return (
    <div className="nested-editor">
      {sections.map((section, sectionIndex) => (
        <div className="editor-group" key={sectionIndex}>
          <div className="form-grid">
            <label>
              機材名
              <input
                value={section.name}
                onChange={(event) => editSection(sectionIndex, { name: event.target.value })}
              />
            </label>
            <label>
              サブタイトル
              <input
                value={section.sub}
                onChange={(event) => editSection(sectionIndex, { sub: event.target.value })}
              />
            </label>
            <label>
              イラスト
              <IconSelect
                value={section.icon}
                onChange={(icon) => editSection(sectionIndex, { icon })}
              />
            </label>
            <label>
              交換・点検の目安
              <textarea
                value={section.guideline}
                onChange={(event) => editSection(sectionIndex, { guideline: event.target.value })}
              />
            </label>
          </div>
          <h4>症状</h4>
          {section.signs.map((sign, signIndex) => (
            <div className="editor-group" key={signIndex}>
              <div className="form-grid">
                <label>
                  重要度
                  <select
                    value={sign.level}
                    onChange={(event) =>
                      editSection(sectionIndex, {
                        signs: section.signs.map((item, i) =>
                          i === signIndex
                            ? { ...item, level: event.target.value as Sign['level'] }
                            : item
                        )
                      })
                    }
                  >
                    <option value="stop">赤：即中止</option>
                    <option value="check">黄：早めに点検</option>
                  </select>
                </label>
                <label>
                  症状
                  <input
                    value={sign.sign}
                    onChange={(event) =>
                      editSection(sectionIndex, {
                        signs: section.signs.map((item, i) =>
                          i === signIndex ? { ...item, sign: event.target.value } : item
                        )
                      })
                    }
                  />
                </label>
                <label>
                  理由
                  <textarea
                    value={sign.why}
                    onChange={(event) =>
                      editSection(sectionIndex, {
                        signs: section.signs.map((item, i) =>
                          i === signIndex ? { ...item, why: event.target.value } : item
                        )
                      })
                    }
                  />
                </label>
              </div>
              <Controls
                items={section.signs}
                index={signIndex}
                onChange={(signs) => editSection(sectionIndex, { signs })}
              />
            </div>
          ))}
          <button
            className="button-secondary"
            onClick={() =>
              editSection(sectionIndex, {
                signs: [...section.signs, { level: 'check', sign: '', why: '' }]
              })
            }
          >
            症状を追加
          </button>
          <Controls
            items={sections}
            index={sectionIndex}
            onChange={(next) => onChange(next.map((item, i) => ({ ...item, no: i + 1 })))}
          />
        </div>
      ))}
      <button
        className="button-secondary"
        onClick={() => onChange([...sections, makeSection(sections.length + 1)])}
      >
        機材を追加
      </button>
    </div>
  );
}
function FieldsEditor<T extends Record<string, string>>({
  title,
  items,
  first,
  second,
  onChange
}: {
  title: string;
  items: T[];
  first: keyof T;
  second: keyof T;
  onChange: (items: T[]) => void;
}) {
  return (
    <div className="nested-editor">
      <h4>{title}</h4>
      {items.map((item, index) => (
        <div className="editor-group" key={index}>
          <label>
            {String(first)}
            <input
              value={item[first]}
              onChange={(event) =>
                onChange(
                  items.map((value, i) =>
                    i === index ? { ...value, [first]: event.target.value } : value
                  )
                )
              }
            />
          </label>
          <label>
            {String(second)}
            <textarea
              value={item[second]}
              onChange={(event) =>
                onChange(
                  items.map((value, i) =>
                    i === index ? { ...value, [second]: event.target.value } : value
                  )
                )
              }
            />
          </label>
          <Controls items={items} index={index} onChange={onChange} />
        </div>
      ))}
      <button
        className="button-secondary"
        onClick={() => onChange([...items, { [first]: '', [second]: '' } as T])}
      >
        行を追加
      </button>
    </div>
  );
}
function BlockForm({
  block,
  onChange,
  upload
}: {
  block: Block;
  onChange: (block: Block) => void;
  upload: (file: File) => Promise<string>;
}) {
  if (block.type === 'heading')
    return (
      <label>
        小見出し
        <input
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </label>
    );
  if (block.type === 'text')
    return (
      <label>
        本文（空行で段落分け、行頭「- 」で箇条書き）
        <textarea
          value={block.text}
          onChange={(event) => onChange({ ...block, text: event.target.value })}
        />
      </label>
    );
  if (block.type === 'callout')
    return (
      <div className="form-grid">
        <label>
          種類
          <select
            value={block.tone}
            onChange={(event) =>
              onChange({ ...block, tone: event.target.value as typeof block.tone })
            }
          >
            <option value="info">情報</option>
            <option value="caution">注意</option>
            <option value="danger">危険</option>
          </select>
        </label>
        <label>
          見出し
          <input
            value={block.title}
            onChange={(event) => onChange({ ...block, title: event.target.value })}
          />
        </label>
        <label>
          本文
          <textarea
            value={block.text}
            onChange={(event) => onChange({ ...block, text: event.target.value })}
          />
        </label>
      </div>
    );
  if (block.type === 'signs')
    return (
      <SignsEditor
        sections={block.sections}
        onChange={(sections) => onChange({ ...block, sections })}
      />
    );
  if (block.type === 'cards')
    return (
      <div className="nested-editor">
        <label>
          列数
          <select
            value={block.columns}
            onChange={(event) =>
              onChange({ ...block, columns: Number(event.target.value) as 2 | 3 })
            }
          >
            <option value={2}>2列</option>
            <option value={3}>3列</option>
          </select>
        </label>
        {block.items.map((item, index) => (
          <div className="editor-group" key={index}>
            <label>
              アイコン（任意）
              <IconSelect
                value={item.icon ?? ''}
                onChange={(icon) =>
                  onChange({
                    ...block,
                    items: block.items.map((value, i) =>
                      i === index ? { ...value, icon: icon || undefined } : value
                    )
                  })
                }
              />
            </label>
            <label>
              見出し
              <input
                value={item.title}
                onChange={(event) =>
                  onChange({
                    ...block,
                    items: block.items.map((value, i) =>
                      i === index ? { ...value, title: event.target.value } : value
                    )
                  })
                }
              />
            </label>
            <label>
              本文
              <textarea
                value={item.text}
                onChange={(event) =>
                  onChange({
                    ...block,
                    items: block.items.map((value, i) =>
                      i === index ? { ...value, text: event.target.value } : value
                    )
                  })
                }
              />
            </label>
            <Controls
              items={block.items}
              index={index}
              onChange={(items) => onChange({ ...block, items })}
            />
          </div>
        ))}
        <button
          className="button-secondary"
          onClick={() => onChange({ ...block, items: [...block.items, { title: '', text: '' }] })}
        >
          カードを追加
        </button>
      </div>
    );
  if (block.type === 'steps')
    return (
      <FieldsEditor
        title="手順"
        items={block.items}
        first="title"
        second="text"
        onChange={(items) => onChange({ ...block, items })}
      />
    );
  if (block.type === 'checklist')
    return (
      <div>
        <label>
          見出し
          <input
            value={block.title}
            onChange={(event) => onChange({ ...block, title: event.target.value })}
          />
        </label>
        <FieldsEditor
          title="項目"
          items={block.items}
          first="text"
          second="level"
          onChange={(items) =>
            onChange({
              ...block,
              items: items.map((item) => ({ ...item, level: item.level || 'check' }) as typeof item)
            })
          }
        />
      </div>
    );
  if (block.type === 'qa')
    return (
      <FieldsEditor
        title="Q&A"
        items={block.items}
        first="q"
        second="a"
        onChange={(items) => onChange({ ...block, items })}
      />
    );
  if (block.type === 'links')
    return (
      <FieldsEditor
        title="参考リンク"
        items={block.items}
        first="label"
        second="url"
        onChange={(items) => onChange({ ...block, items })}
      />
    );
  if (block.type === 'table')
    return (
      <div className="nested-editor">
        <label>
          見出し（タブで区切る）
          <input
            value={block.headers.join('\t')}
            onChange={(event) =>
              onChange({ ...block, headers: event.target.value.split('\t'), rows: block.rows })
            }
          />
        </label>
        <label>
          表の行（1行ずつ、タブで列を区切る）
          <textarea
            value={block.rows.map((row) => row.join('\t')).join('\n')}
            onChange={(event) =>
              onChange({
                ...block,
                rows: event.target.value
                  .split('\n')
                  .filter(Boolean)
                  .map((line) => line.split('\t'))
              })
            }
          />
        </label>
      </div>
    );
  return (
    <div className="form-grid">
      <label>
        画像ファイル
        <input
          className="file-input"
          type="file"
          accept="image/*"
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void upload(file).then((src) => onChange({ ...block, src }));
          }}
        />
      </label>
      {block.src && <img className="editor-image-preview" src={block.src} alt="" />}
      <label>
        代替テキスト
        <input
          value={block.alt}
          onChange={(event) => onChange({ ...block, alt: event.target.value })}
        />
      </label>
      <label>
        キャプション
        <input
          value={block.caption}
          onChange={(event) => onChange({ ...block, caption: event.target.value })}
        />
      </label>
    </div>
  );
}

export function AdminDocsListPage() {
  usePageTitle('資料管理');
  const [docs, setDocs] = useState<DivingDoc[]>([]);
  const [reordering, setReordering] = useState(false);
  const [beforeOrder, setBeforeOrder] = useState<DivingDoc[]>([]);
  useEffect(() => {
    void requireSupabase()
      .from('docs')
      .select('*')
      .order('sort_order')
      .then(({ data }) => setDocs((data ?? []) as DivingDoc[]));
  }, []);
  const move = (index: number, direction: -1 | 1) =>
    setDocs((items) => reorder(items, index, direction));
  const saveOrder = async () => {
    const result = await requireSupabase().rpc('reorder_docs', {
      p_ids: docs.map((doc) => doc.id)
    });
    if (!result.error) {
      setReordering(false);
      setBeforeOrder([]);
    }
  };
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
        <button
          className="button-secondary"
          onClick={() => {
            setBeforeOrder(docs);
            setReordering(!reordering);
          }}
        >
          {reordering ? '編集に戻る' : '並び替え'}
        </button>
      </div>
      {reordering && (
        <div className="button-row">
          <button className="button" onClick={() => void saveOrder()}>
            並び順を保存
          </button>
          <button
            className="button-secondary"
            onClick={() => {
              setDocs(beforeOrder);
              setReordering(false);
            }}
          >
            元に戻す
          </button>
        </div>
      )}
      <div className="admin-list">
        {docs.map((doc, index) =>
          reordering ? (
            <article
              className="panel news-row reorder-row"
              key={doc.id}
              draggable
              onDragStart={(event) => event.dataTransfer.setData('text/plain', String(index))}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                const from = Number(event.dataTransfer.getData('text/plain'));
                if (Number.isFinite(from)) {
                  const next = [...docs];
                  const [picked] = next.splice(from, 1);
                  next.splice(index, 0, picked);
                  setDocs(next);
                }
              }}
            >
              <span className="drag-handle" aria-label="ドラッグして並び替え">
                ⠿
              </span>
              <b>{doc.title}</b>
              <button onClick={() => move(index, -1)} disabled={index === 0}>
                ↑
              </button>
              <button onClick={() => move(index, 1)} disabled={index === docs.length - 1}>
                ↓
              </button>
            </article>
          ) : (
            <Link className="panel news-row" key={doc.id} to={'/admin/docs/' + doc.id}>
              <span className="meta">
                {doc.status === 'published' ? '公開中' : '下書き'} ・ 並び順 {doc.sort_order}
              </span>
              <b>{doc.title}</b>
              <span>{doc.slug}</span>
            </Link>
          )
        )}
      </div>
    </>
  );
}

export function AdminDocEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { refreshPublic } = useAppData();
  const [doc, setDoc] = useState<DivingDoc>(blankDoc);
  const [chooseTemplate, setChooseTemplate] = useState(!id);
  const [tab, setTab] = useState<'form' | 'preview'>('form');
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState('');
  const body = normalizeDocBody(doc.body);
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
        else setDoc({ ...(data as DivingDoc), body: normalizeDocBody((data as DivingDoc).body) });
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
  const change = <K extends keyof DivingDoc>(key: K, value: DivingDoc[K]) => {
    setDoc((current) => ({ ...current, [key]: value }));
    setDirty(true);
  };
  const changeBody = (value: DocBody) => change('body', value);
  const upload = async (file: File) => {
    const jpeg = await resizeToJpeg(file);
    const path = 'docs/' + crypto.randomUUID() + '.jpg';
    const client = requireSupabase();
    const result = await client.storage
      .from('docs-images')
      .upload(path, jpeg, { contentType: 'image/jpeg' });
    if (result.error) throw result.error;
    return client.storage.from('docs-images').getPublicUrl(path).data.publicUrl;
  };
  const save = async () => {
    setError('');
    const slugError = validateSlug(doc.slug);
    if (!doc.title.trim() || slugError)
      return setError(
        !doc.title.trim()
          ? 'タイトルを入力してください。'
          : (slugError ?? 'slug を確認してください。')
      );
    const blockError = body.blocks.map(validateBlock).find(Boolean);
    if (blockError) return setError(blockError);
    const { id: docId, ...payload } = { ...doc, body };
    const client = requireSupabase();
    const result = docId
      ? await client.from('docs').update(payload).eq('id', docId).select().single()
      : await client.from('docs').insert(payload).select().single();
    if (result.error) return setError(result.error.message ?? '保存できませんでした。');
    setDoc(result.data as DivingDoc);
    setDirty(false);
    await refreshPublic();
    if (!docId) navigate('/admin/docs/' + result.data.id, { replace: true });
  };
  if (chooseTemplate)
    return (
      <>
        <p className="kicker">資料</p>
        <h1>テンプレートを選択</h1>
        <p>作成後もブロックは自由に追加・削除・並べ替えできます。</p>
        <div className="template-grid">
          {templates.map((template) => (
            <button
              className="panel template-choice"
              key={template.label}
              onClick={() => {
                setDoc(blankDoc(template.blocks));
                setChooseTemplate(false);
              }}
            >
              {template.label}
            </button>
          ))}
        </div>
      </>
    );
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
        <DocContent doc={{ ...doc, body }} preview />
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
              <IconSelect value={doc.icon ?? ''} onChange={(icon) => change('icon', icon)} />
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
              リード文
              <textarea
                value={body.intro}
                onChange={(event) => changeBody({ ...body, intro: event.target.value })}
              />
            </label>
          </div>
          <section className="editor-group">
            <h3>ブロック</h3>
            {body.blocks.map((block, index) => (
              <div className="editor-group" key={index}>
                <div className="editor-block-head">
                  <h4>{block.type}</h4>
                  <Controls
                    items={body.blocks}
                    index={index}
                    onChange={(blocks) => changeBody({ ...body, blocks })}
                  />
                  <button
                    onClick={() =>
                      changeBody({
                        ...body,
                        blocks: [
                          ...body.blocks.slice(0, index + 1),
                          structuredClone(block),
                          ...body.blocks.slice(index + 1)
                        ]
                      })
                    }
                  >
                    複製
                  </button>
                </div>
                <BlockForm
                  block={block}
                  onChange={(next) =>
                    changeBody({
                      ...body,
                      blocks: body.blocks.map((item, i) => (i === index ? next : item))
                    })
                  }
                  upload={upload}
                />
              </div>
            ))}
            <label>
              ブロックを追加
              <select
                defaultValue=""
                onChange={(event) => {
                  if (event.target.value) {
                    changeBody({
                      ...body,
                      blocks: [...body.blocks, makeBlock(event.target.value as Block['type'])]
                    });
                    event.target.value = '';
                  }
                }}
              >
                <option value="" disabled>
                  種類を選択
                </option>
                {(
                  [
                    'heading',
                    'text',
                    'callout',
                    'signs',
                    'cards',
                    'steps',
                    'checklist',
                    'table',
                    'image',
                    'qa',
                    'links'
                  ] as Block['type'][]
                ).map((type) => (
                  <option value={type} key={type}>
                    {type}
                  </option>
                ))}
              </select>
            </label>
          </section>
          <label>
            注意書き
            <textarea
              value={body.disclaimer}
              onChange={(event) => changeBody({ ...body, disclaimer: event.target.value })}
            />
          </label>
          {error && <p className="error">{error}</p>}
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
