import { useEffect, useMemo, useState } from 'react';
import { InlineBold } from '../InlineBold';
import type { Block } from '../../types';
import { SignsBlock } from './SignsBlock';

function FormattedText({ text }: { text: string }) {
  return text.split(/\n\s*\n/).map((paragraph, index) => {
    const lines = paragraph.split('\n');
    const list = lines.every((line) => line.startsWith('- '));
    return list ? (
      <ul key={index}>
        {lines.map((line, item) => (
          <li key={item}>
            <InlineBold text={line.slice(2)} />
          </li>
        ))}
      </ul>
    ) : (
      <p key={index}>
        {lines.map((line, item) => (
          <span key={item}>
            <InlineBold text={line} />
            {item < lines.length - 1 && <br />}
          </span>
        ))}
      </p>
    );
  });
}

function TextBlock({ text }: { text: string }) {
  return (
    <div className="text-block">
      <FormattedText text={text} />
    </div>
  );
}

function ChecklistBlock({
  title,
  items,
  storageKey,
  print = false
}: Extract<Block, { type: 'checklist' }> & { storageKey?: string; print?: boolean }) {
  const initial = useMemo(() => {
    if (!storageKey) return [] as boolean[];
    try {
      const value = localStorage.getItem(storageKey);
      return value ? (JSON.parse(value) as boolean[]) : [];
    } catch {
      return [] as boolean[];
    }
  }, [storageKey]);
  const [checked, setChecked] = useState<boolean[]>(initial);
  useEffect(() => {
    if (storageKey) localStorage.setItem(storageKey, JSON.stringify(checked));
  }, [checked, storageKey]);
  const reset = () => setChecked([]);
  if (print) {
    return (
      <section className="panel checklist-block checklist-block-print">
        <h2>{title}</h2>
        <ul>
          {items.map((item, index) => (
            <li key={`${item.text}-${index}`} className={item.level ?? ''}>
              {item.level === 'stop' && <b className="always-red">● </b>}
              {item.level === 'check' && <b className="check-dot">● </b>}
              {item.text}
            </li>
          ))}
        </ul>
      </section>
    );
  }
  return (
    <section className="panel checklist-block">
      <h2>{title}</h2>
      <ul>
        {items.map((item, index) => (
          <li key={`${item.text}-${index}`} className={item.level ?? ''}>
            <label>
              <input
                type="checkbox"
                checked={Boolean(checked[index])}
                onChange={(event) =>
                  setChecked((current) => {
                    const next = [...current];
                    next[index] = event.target.checked;
                    return next;
                  })
                }
              />
              <span>
                {item.level === 'stop' && <b className="always-red">● </b>}
                {item.text}
              </span>
            </label>
          </li>
        ))}
      </ul>
      <button className="button-secondary" onClick={reset}>
        チェックをリセット
      </button>
    </section>
  );
}

function CardBlock({ columns, items }: Extract<Block, { type: 'cards' }>) {
  return (
    <div className={`content-card-grid columns-${columns}`}>
      {items.map((item, index) => (
        <section className="panel content-card" key={`${item.title}-${index}`}>
          {item.icon && <img src={`${import.meta.env.BASE_URL}img/${item.icon}.png`} alt="" />}
          <h3>{item.title}</h3>
          <p>{item.text}</p>
        </section>
      ))}
    </div>
  );
}

export function ContentBlock({
  block,
  preview = false,
  checklistKey,
  print = false,
  docSlug
}: {
  block: Block;
  preview?: boolean;
  checklistKey?: string;
  print?: boolean;
  docSlug?: string;
}) {
  switch (block.type) {
    case 'heading':
      return <h2 className="block-heading">{block.text}</h2>;
    case 'text':
      return <TextBlock text={block.text} />;
    case 'callout':
      return (
        <aside className={`callout ${block.tone}`}>
          <b>{block.title}</b>
          <div className="callout-content">
            <FormattedText text={block.text} />
          </div>
        </aside>
      );
    case 'signs':
      return (
        <SignsBlock sections={block.sections} preview={preview} print={print} docSlug={docSlug} />
      );
    case 'cards':
      return <CardBlock {...block} />;
    case 'steps':
      return (
        <ol className="steps-block">
          {block.items.map((item, index) => (
            <li key={`${item.title}-${index}`}>
              <b>
                <InlineBold text={item.title} />
              </b>
              {item.text && (
                <p>
                  <InlineBold text={item.text} />
                </p>
              )}
            </li>
          ))}
        </ol>
      );
    case 'checklist':
      return <ChecklistBlock {...block} storageKey={checklistKey} print={print} />;
    case 'table':
      return (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                {block.headers.map((header, index) => (
                  <th key={index}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {block.rows.map((row, rowIndex) => (
                <tr key={rowIndex}>
                  {block.headers.map((_, cellIndex) => (
                    <td key={cellIndex}>{row[cellIndex] ?? ''}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    case 'image':
      return (
        <figure className="image-block">
          <img src={block.src} alt={block.alt} loading={print ? 'eager' : 'lazy'} />
          {block.caption && <figcaption>{block.caption}</figcaption>}
        </figure>
      );
    case 'qa':
      return (
        <div className="qa-block">
          {block.items.map((item, index) => (
            <details key={`${item.q}-${index}`} open={print || undefined}>
              <summary>
                <InlineBold text={item.q} />
              </summary>
              <div className="qa-answer">
                <div className="qa-answer-content">
                  <p>
                    <InlineBold text={item.a} />
                  </p>
                </div>
              </div>
            </details>
          ))}
        </div>
      );
    case 'links':
      return (
        <ul className="links-block">
          {block.items.map((item, index) => (
            <li key={`${item.label}-${index}`}>
              <a
                href={item.url}
                target={/^https?:\/\//.test(item.url) ? '_blank' : undefined}
                rel={/^https?:\/\//.test(item.url) ? 'noreferrer' : undefined}
              >
                {item.label}
              </a>
            </li>
          ))}
        </ul>
      );
  }
}
