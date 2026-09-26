import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { normalizeDocBody } from '../lib/logic';
import type { DivingDoc } from '../types';
import { ContentBlock } from './blocks';
import { bookmarkAnchor } from '../lib/logic';
import { BookmarkButton } from './BookmarkButton';

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
  const anchors = body.blocks.flatMap((block) => {
    if (block.type === 'heading') return [{ id: bookmarkAnchor(block.text), label: block.text }];
    if (block.type === 'signs') {
      return block.sections.map((section) => ({
        id: bookmarkAnchor(section.name),
        label: `${section.no}. ${section.name}`
      }));
    }
    return [];
  });

  return (
    <article className="doc-detail">
      <p className="kicker">{doc.category}</p>
      <div className="doc-title-row">
        <h1>{doc.title}</h1>
        {!print && !preview && <BookmarkButton docSlug={doc.slug} label={doc.title} />}
      </div>
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
            id={block.type === 'heading' ? bookmarkAnchor(block.text) : undefined}
            key={`${block.type}-${index}`}
          >
            {block.type === 'heading' && !print && !preview && (
              <BookmarkButton
                docSlug={doc.slug}
                anchor={bookmarkAnchor(block.text)}
                label={block.text}
                small
              />
            )}
            <ContentBlock
              block={block}
              preview={preview}
              print={print}
              checklistKey={preview || print ? undefined : `doc:${doc.slug}:check`}
              docSlug={doc.slug}
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
