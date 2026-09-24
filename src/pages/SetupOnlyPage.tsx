import { Link } from 'react-router-dom';
import { usePageTitle } from '../lib/pageTitle';

export function SetupOnlyPage() {
  usePageTitle('掲示板');
  return (
    <section>
      <h1>Supabase が未設定です</h1>
      <p>掲示板を利用するには Supabase の環境変数を設定してください。資料は閲覧できます。</p>
      <Link className="button" to="/docs">
        資料を見る
      </Link>
    </section>
  );
}
