import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/pageTitle';

export function NotFoundPage() {
  usePageTitle('404');
  return (
    <section>
      <p className="kicker">404</p>
      <h1>ページが見つかりません</h1>
      <p>URLをご確認ください。</p>
      <Link className="button" to="/">
        ホームへ戻る
      </Link>
    </section>
  );
}
