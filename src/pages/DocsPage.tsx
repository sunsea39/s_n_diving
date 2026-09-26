import { useState } from 'react';
import { DocCard } from '../components/DocContent';
import { useAppData } from '../context/AppDataContext';
import { groupDocsByCategory } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';
import { PageHeading } from '../components/PageHeading';

export function DocsPage() {
  usePageTitle('資料');
  const { docs } = useAppData();
  const [category, setCategory] = useState('すべて');
  const groups = groupDocsByCategory(docs);
  const visibleGroups =
    category === 'すべて' ? groups : groups.filter((group) => group.category === category);

  return (
    <>
      <PageHeading page="docs" />
      <div className="category-row" aria-label="資料カテゴリで絞り込む">
        {['すべて', ...groups.map((group) => group.category)].map((item) => (
          <button
            className="chip"
            aria-pressed={category === item}
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
