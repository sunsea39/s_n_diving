import { useState } from 'react';
import { DocCard } from '../components/DocContent';
import { useAppData } from '../context/AppDataContext';
import { groupDocsByCategory } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';

export function DocsPage() {
  usePageTitle('資料');
  const { docs } = useAppData();
  const [category, setCategory] = useState('すべて');
  const groups = groupDocsByCategory(docs);
  const visibleGroups =
    category === 'すべて' ? groups : groups.filter((group) => group.category === category);

  return (
    <>
      <p className="kicker">資料</p>
      <h1>安全資料</h1>
      <p className="lead">潜る前に、仲間どうしで確認したい情報です。</p>
      <div className="category-row" aria-label="資料カテゴリで絞り込む">
        {['すべて', ...groups.map((group) => group.category)].map((item) => (
          <button
            className={category === item ? 'selected' : ''}
            key={item}
            onClick={() => setCategory(item)}
          >
            {item}
          </button>
        ))}
      </div>
      {visibleGroups.map((group) => (
        <section className="doc-category" key={group.category}>
          <h2>{group.category}</h2>
          <div className="card-grid">
            {group.docs.map((doc) => (
              <DocCard doc={doc} key={doc.slug} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
