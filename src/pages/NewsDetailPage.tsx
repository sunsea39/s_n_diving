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
      <p className="kicker">{item.category === 'dive' ? 'ダイビング' : 'その他'}</p>
      <h1>{item.title}</h1>
      <p className="meta">
        {item.published_at ? new Date(item.published_at).toLocaleString('ja-JP') : ''}
      </p>
      {item.category === 'dive' && item.dive_start && (
        <p>
          <b>予定：</b>
          {item.dive_start}
          {item.dive_end && item.dive_end !== item.dive_start ? `〜${item.dive_end}` : ''}{' '}
          {item.place} {item.staff && `・担当：${item.staff}`}
        </p>
      )}
      <p className="post-body">
        <PlainText text={item.body} />
      </p>
    </article>
  );
}
