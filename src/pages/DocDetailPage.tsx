import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { DocContent } from '../components/DocContent';
import { useAppData } from '../context/AppDataContext';
import { usePageTitle } from '../lib/pageTitle';
import { NotFoundPage } from './NotFoundPage';
import { normalizeDocBody, relatedAccidentsForDoc } from '../lib/logic';
import { filterBlocksForSummary, readDocView, type DocView } from '../lib/docView';

export function DocDetailPage() {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { docs, disclaimer, accidents } = useAppData();
  const doc = docs.find((item) => item.slug === slug);
  usePageTitle(doc?.title ?? '資料');
  const displayDoc =
    doc && disclaimer && doc.category !== 'ダイビング入門'
      ? { ...doc, body: { ...doc.body, disclaimer } }
      : doc;
  const view = readDocView(location.search);
  const setView = (nextView: DocView) => {
    try {
      localStorage.setItem('ns-doc-view', nextView);
    } catch {
      // Storage is optional; the URL still preserves the requested view.
    }
    const params = new URLSearchParams(location.search);
    if (nextView === 'summary') params.set('view', 'summary');
    else params.delete('view');
    navigate({ search: params.toString() ? `?${params.toString()}` : '' }, { replace: true });
  };
  const renderedDoc =
    displayDoc && view === 'summary'
      ? {
          ...displayDoc,
          body: (() => {
            const body = normalizeDocBody(displayDoc.body);
            return { ...body, blocks: filterBlocksForSummary(body.blocks) };
          })()
        }
      : displayDoc;

  const related = doc ? relatedAccidentsForDoc(accidents, doc.slug) : [];
  return displayDoc ? (
    <>
      <div className="button-row doc-print-link">
        <Link className="button-secondary" to={`/docs/${displayDoc.slug}/print`}>
          PDF・印刷
        </Link>
      </div>
      <div className="doc-view-toggle">
        <button
          className="chip"
          aria-pressed={view === 'summary'}
          onClick={() => setView(view === 'summary' ? 'full' : 'summary')}
        >
          要点のみ
        </button>
      </div>
      <DocContent doc={renderedDoc ?? displayDoc} />
      {related.length > 0 && (
        <section className="related-accidents">
          <h2>関連する事故事例</h2>
          <div className="card-grid">
            {related.map((accident) => (
              <Link className="panel news-row" to={`/accidents/${accident.slug}`} key={accident.id}>
                <b>{accident.title}</b>
                <p>{accident.summary}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </>
  ) : (
    <NotFoundPage />
  );
}
