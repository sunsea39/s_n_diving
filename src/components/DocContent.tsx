import { Link } from 'react-router-dom';
import { normalizeDocBody } from '../lib/logic';
import type { DivingDoc } from '../types';
import { ContentBlock } from './blocks';

const assetPath = (icon: string) => `${import.meta.env.BASE_URL}img/${icon}.png`;

export function DocContent({ doc, preview = false }: { doc: DivingDoc; preview?: boolean }) {
  const body = normalizeDocBody(doc.body);
  const anchors = body.blocks.flatMap((block) => {
    if (block.type === 'heading') return [{ id: `heading-${block.text}`, label: block.text }];
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
      {anchors.length > 0 && (
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
            id={block.type === 'heading' ? `heading-${block.text}` : undefined}
            key={`${block.type}-${index}`}
          >
            <ContentBlock
              block={block}
              preview={preview}
              checklistKey={preview ? undefined : `doc:${doc.slug}:check`}
            />
          </section>
        ))}
      </div>
      {body.disclaimer && <aside className="disclaimer">{body.disclaimer}</aside>}
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
