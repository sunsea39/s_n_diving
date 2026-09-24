import { useParams } from 'react-router-dom';
import { DocContent } from '../components/DocContent';
import { useAppData } from '../context/AppDataContext';
import { usePageTitle } from '../lib/pageTitle';
import { NotFoundPage } from './NotFoundPage';

export function DocDetailPage() {
  const { slug } = useParams();
  const { docs, disclaimer } = useAppData();
  const doc = docs.find((item) => item.slug === slug);
  usePageTitle(doc?.title ?? '資料');
  const displayDoc = doc && disclaimer ? { ...doc, body: { ...doc.body, disclaimer } } : doc;

  return displayDoc ? <DocContent doc={displayDoc} /> : <NotFoundPage />;
}
