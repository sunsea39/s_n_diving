import { Link, useParams } from 'react-router-dom';
import { DocContent } from '../components/DocContent';
import { useAppData } from '../context/AppDataContext';
import { usePageTitle } from '../lib/pageTitle';
import { NotFoundPage } from './NotFoundPage';
import { relatedAccidentsForDoc } from '../lib/logic';

export function DocDetailPage() {
  const { slug } = useParams();
  const { docs, disclaimer, accidents } = useAppData();
  const doc = docs.find((item) => item.slug === slug);
  usePageTitle(doc?.title ?? '資料');
  const displayDoc = doc && disclaimer ? { ...doc, body: { ...doc.body, disclaimer } } : doc;

  const related = doc ? relatedAccidentsForDoc(accidents, doc.slug) : [];
  return displayDoc ? (
    <>
      <DocContent doc={displayDoc} />
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
