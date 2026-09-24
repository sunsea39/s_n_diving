import { useParams } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { usePageTitle } from '../lib/pageTitle';
import { PlainText } from '../lib/text';
import { NotFoundPage } from './NotFoundPage';

export function NewsDetailPage() {
  const { id } = useParams();
  const { news } = useAppData();
  const item = news.find((entry) => entry.id === id);
  usePageTitle(item?.title ?? 'お知らせ');

  if (!item) return <NotFoundPage />;

  return (
    <article className="panel thread-header">
      <p className="kicker">お知らせ</p>
      <h1>{item.title}</h1>
      <p className="meta">
        {item.published_at ? new Date(item.published_at).toLocaleString('ja-JP') : ''}
      </p>
      {item.next_dive_at && (
        <p>
          <b>次回予定：</b>
          {new Date(item.next_dive_at).toLocaleString('ja-JP')} {item.next_dive_place}
        </p>
      )}
      <p className="post-body">
        <PlainText text={item.body} />
      </p>
    </article>
  );
}
