import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeDocBody } from '../lib/logic';
import type { DivingDoc } from '../types';
import { ContentBlock } from './blocks';

const assetPath = (icon: string) => `${import.meta.env.BASE_URL}img/${icon}.png`;

function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const update = () => setVisible(window.scrollY >= 600);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <button
      className={`back-to-top ${visible ? 'visible' : ''}`}
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      tabIndex={visible ? 0 : -1}
      aria-hidden={!visible}
    >
      ▲ 上へ
    </button>
  );
}

export function DocContent({
  doc,
  preview = false,
  print = false
}: {
  doc: DivingDoc;
  preview?: boolean;
  print?: boolean;
}) {
  const body = normalizeDocBody(doc.body);
  const anchors = body.blocks.flatMap((block, index) => {
    if (block.type === 'heading') return [{ id: `heading-${index}`, label: block.text }];
    if (block.type === 'signs') {
      return block.sections.map((section) => ({
        id: `equipment-${section.no}`,
        label: `${section.no}. ${section.name}`
      }));
    }
    return [];
  });

  return (
    <article className="doc-detail">
      <p className="kicker">{doc.category}</p>
      <h1>{doc.title}</h1>
      {body.intro && <p className="lead">{body.intro}</p>}
      {!print && anchors.length > 0 && (
        <nav className="anchor-chips" aria-label="ページ内目次">
          {anchors.map((anchor) => (
            <a href={`#${anchor.id}`} key={anchor.id}>
              {anchor.label}
            </a>
          ))}
        </nav>
      )}
      <div className="doc-blocks">
        {body.blocks.map((block, index) => (
          <section
            id={block.type === 'heading' ? `heading-${index}` : undefined}
            key={`${block.type}-${index}`}
          >
            <ContentBlock
              block={block}
              preview={preview}
              print={print}
              checklistKey={preview || print ? undefined : `doc:${doc.slug}:check`}
            />
          </section>
        ))}
      </div>
      {body.disclaimer && <aside className="disclaimer">{body.disclaimer}</aside>}
      {!preview && !print && <BackToTop />}
    </article>
  );
}

export function DocCard({ doc }: { doc: DivingDoc }) {
  const icon = doc.icon || 'mask';
  return (
    <Link className="panel doc-card" to={`/docs/${doc.slug}`}>
      {doc.icon !== '' && <img src={assetPath(icon)} alt="" />}
      <span>
        <small className="kicker">{doc.category}</small>
        <b>{doc.title}</b>
        <p>{doc.summary}</p>
      </span>
    </Link>
  );
}
