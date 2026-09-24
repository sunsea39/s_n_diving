import { DocCard } from '../components/DocContent';
import { useAppData } from '../context/AppDataContext';
import { usePageTitle } from '../lib/pageTitle';

export function DocsPage() {
  usePageTitle('資料');
  const { docs } = useAppData();

  return (
    <>
      <p className="kicker">資料</p>
      <h1>安全資料</h1>
      <p className="lead">潜る前に、仲間どうしで確認したい情報です。</p>
      <div className="card-grid">
        {docs.map((doc) => (
          <DocCard doc={doc} key={doc.slug} />
        ))}
      </div>
    </>
  );
}
