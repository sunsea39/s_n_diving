import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { DocContent } from '../components/DocContent';
import { PrintCardPreview } from '../components/PrintCardPreview';
import { PrintControls } from '../components/PrintControls';
import { useAppData } from '../context/AppDataContext';
import { normalizeDocBody } from '../lib/logic';
import { readPrintSettings, writePrintSettings, type PrintSettings } from '../lib/print';
import { usePageTitle } from '../lib/pageTitle';

export function DocPrintPage() {
  const { slug } = useParams();
  const { docs, disclaimer } = useAppData();
  const doc = docs.find((item) => item.slug === slug);
  const [settings, setSettings] = useState<PrintSettings>(() => readPrintSettings());
  usePageTitle(doc ? `${doc.title}（印刷）` : '資料の印刷');

  useEffect(() => writePrintSettings(settings), [settings]);

  if (!doc) {
    return (
      <main className="print-page print-page--missing">
        <p>資料が見つかりません。</p>
      </main>
    );
  }

  const normalized = normalizeDocBody(doc.body);
  const displayDoc = {
    ...doc,
    body: { ...normalized, disclaimer: normalized.disclaimer || disclaimer }
  };
  const pageClass =
    settings.format === 'cards'
      ? `print-page--cards print-page--${settings.paper}-${settings.cardSize}`
      : 'print-page--full';

  return (
    <main className={`print-page ${pageClass}`}>
      <PrintControls
        backLabel="資料に戻る"
        backTo={`/docs/${doc.slug}`}
        onChange={setSettings}
        settings={settings}
      />
      {settings.format === 'cards' ? (
        <PrintCardPreview doc={displayDoc} settings={settings} />
      ) : (
        <article className="print-full print-full-doc">
          <DocContent doc={displayDoc} print />
        </article>
      )}
    </main>
  );
}
