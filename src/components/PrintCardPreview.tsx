import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ContentBlock } from './blocks';
import {
  createPrintCards,
  splitPrintCard,
  tilePrintCards,
  type PrintCard,
  type PrintCardSize,
  type PrintSettings
} from '../lib/print';
import type { DivingDoc, EquipmentSection } from '../types';

const assetPath = (icon: string) => `${import.meta.env.BASE_URL}img/${icon}.png`;
const logoPath = `${import.meta.env.BASE_URL}icons/logo.svg`;
const cardMinimum: Record<PrintCardSize, number> = { a6: 7, a7: 6.5 };

function waitForImages(element: HTMLElement) {
  return Promise.all(
    Array.from(element.querySelectorAll('img')).map((image) =>
      image.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            image.addEventListener('load', () => resolve(), { once: true });
            image.addEventListener('error', () => resolve(), { once: true });
          })
    )
  );
}

function PrintEquipmentCard({
  section,
  continuation = false
}: {
  section: EquipmentSection;
  continuation?: boolean;
}) {
  return (
    <div className="print-equipment">
      <div className="print-equipment-heading">
        <img src={assetPath(section.icon)} alt="" />
        <div>
          <h2>{`${section.no}. ${section.name}${continuation ? '（続き）' : ''}`}</h2>
          <p>{section.sub}</p>
        </div>
      </div>
      <ul className="print-sign-list">
        {section.signs.map((sign, index) => (
          <li key={`${sign.sign}-${index}`} className={sign.level}>
            <b>● </b>
            <strong>{sign.sign}</strong>
            <span> — {sign.why}</span>
          </li>
        ))}
      </ul>
      <div className="print-guideline">
        <b>交換・点検の目安</b>
        <p>{section.guideline}</p>
      </div>
    </div>
  );
}

function PrintCardBody({
  card,
  doc,
  hasSigns
}: {
  card: PrintCard;
  doc: DivingDoc;
  hasSigns: boolean;
}) {
  if (card.kind === 'cover') {
    return (
      <div className="print-cover">
        <p className="print-card-category">{doc.category}</p>
        <h1>{`${doc.title}${card.continuation ? '（続き）' : ''}`}</h1>
        {card.intro && <p className="print-cover-intro">{card.intro}</p>}
        {hasSigns && (
          <div className="print-legend">
            <span className="stop-dot">● 使用を中止してすぐ点検・交換</span>
            <span className="check-dot">● 早めに点検・交換を検討</span>
          </div>
        )}
      </div>
    );
  }
  if (card.kind === 'signs' && card.section)
    return <PrintEquipmentCard continuation={card.continuation} section={card.section} />;
  return (
    <div className="print-card-blocks">
      <h2>
        {card.title}
        {card.continuation && '（続き）'}
      </h2>
      {card.blocks.map((block, index) => (
        <ContentBlock block={block} key={`${block.type}-${index}`} print />
      ))}
    </div>
  );
}

function CropMarks() {
  return (
    <span className="crop-marks" aria-hidden="true">
      <i className="crop-mark crop-mark-top-left" />
      <i className="crop-mark crop-mark-top-right" />
      <i className="crop-mark crop-mark-bottom-left" />
      <i className="crop-mark crop-mark-bottom-right" />
    </span>
  );
}

function AutoFitCard({
  card,
  doc,
  cardSize,
  tiled,
  hasSigns,
  onOverflow
}: {
  card: PrintCard;
  doc: DivingDoc;
  cardSize: PrintCardSize;
  tiled: boolean;
  hasSigns: boolean;
  onOverflow: (id: string) => void;
}) {
  const content = useRef<HTMLDivElement>(null);
  const [fontSize, setFontSize] = useState(10);
  const splitRequested = useRef(false);
  const minimum = cardMinimum[cardSize];

  useEffect(() => {
    setFontSize(10);
    splitRequested.current = false;
  }, [card.id, cardSize]);

  useLayoutEffect(() => {
    let cancelled = false;
    const measure = () => {
      if (cancelled || !content.current) return;
      const { clientHeight, scrollHeight } = content.current;
      if (scrollHeight <= clientHeight + 1) return;
      if (fontSize > minimum) {
        setFontSize((current) => Math.max(minimum, current - 0.5));
      } else if (!splitRequested.current) {
        splitRequested.current = true;
        onOverflow(card.id);
      }
    };
    const fontsReady = document.fonts?.ready ?? Promise.resolve();
    void Promise.all([
      waitForImages(content.current ?? document.createElement('div')),
      fontsReady
    ]).then(() => {
      window.requestAnimationFrame(measure);
    });
    return () => {
      cancelled = true;
    };
  }, [card.id, fontSize, minimum, onOverflow]);

  return (
    <div className={`print-card-tile ${tiled ? 'print-card-tile--tiled' : ''}`}>
      {tiled && <CropMarks />}
      <article
        className={`print-card print-card--${cardSize}`}
        style={{ '--print-card-font-size': `${fontSize}pt` } as React.CSSProperties}
      >
        <header className="print-card-header">
          <span>{doc.title}</span>
          <img src={logoPath} alt="N×S_Diving" />
        </header>
        <div ref={content} className="print-card-content">
          <PrintCardBody card={card} doc={doc} hasSigns={hasSigns} />
        </div>
        <footer className="print-card-disclaimer">
          目安です。取扱説明書・インストラクターの指示を優先
        </footer>
      </article>
    </div>
  );
}

export function PrintCardPreview({ doc, settings }: { doc: DivingDoc; settings: PrintSettings }) {
  const baseCards = useMemo(() => createPrintCards(doc, settings.content), [doc, settings.content]);
  const [cards, setCards] = useState(baseCards);
  const hasSigns = useMemo(() => baseCards.some((card) => card.kind === 'signs'), [baseCards]);

  useEffect(() => setCards(baseCards), [baseCards]);

  const splitOverflowingCard = useCallback((id: string) => {
    setCards((current) =>
      current.flatMap((card) => {
        if (card.id !== id) return [card];
        return splitPrintCard(card) ?? [card];
      })
    );
  }, []);

  const tiled = settings.paper === 'tiled';
  const sheets = tiled ? tilePrintCards(cards, settings.cardSize) : cards.map((card) => [card]);
  return (
    <section
      className={`print-card-preview print-card-preview--${settings.cardSize} ${
        tiled ? 'print-card-preview--tiled' : 'print-card-preview--single'
      }`}
      aria-label="カード印刷プレビュー"
    >
      {sheets.map((sheet, sheetIndex) => (
        <div className="print-card-sheet" key={`sheet-${sheetIndex}`}>
          {sheet.map((card) => (
            <AutoFitCard
              card={card}
              cardSize={settings.cardSize}
              doc={doc}
              hasSigns={hasSigns}
              key={card.id}
              onOverflow={splitOverflowingCard}
              tiled={tiled}
            />
          ))}
        </div>
      ))}
    </section>
  );
}
