import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { accidentOutcomeMeta, accidentOutcomes, sortAndFilterAccidents } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';
import type { AccidentOutcome } from '../types';
import { PageHeading } from '../components/PageHeading';

export function AccidentCard({
  accident
}: {
  accident: {
    slug: string;
    title: string;
    occurred_on: string | null;
    occurred_label: string;
    location: string;
    outcome: AccidentOutcome;
    tags: string[];
    summary: string;
  };
}) {
  const outcome = accidentOutcomeMeta(accident.outcome);
  return (
    <Link className="panel accident-card" to={'/accidents/' + accident.slug}>
      <span className={'outcome-badge ' + outcome.className}>{outcome.label}</span>
      <h2>{accident.title}</h2>
      <p className="meta">
        {accident.occurred_label || accident.occurred_on || '時期不明'}
        {accident.location && ' ・ ' + accident.location}
      </p>
      <div className="tag-row">
        {accident.tags.map((tag) => (
          <span className="tag" key={tag}>
            {tag}
          </span>
        ))}
      </div>
      <p className="accident-summary">{accident.summary}</p>
    </Link>
  );
}

export function AccidentsPage() {
  usePageTitle('事故事例');
  const { accidents } = useAppData();
  const [outcome, setOutcome] = useState<AccidentOutcome | 'all'>('all');
  const [tag, setTag] = useState('all');
  const tags = [...new Set(accidents.flatMap((accident) => accident.tags))].sort();
  const visible = useMemo(
    () => sortAndFilterAccidents(accidents, { outcome, tag }),
    [accidents, outcome, tag]
  );
  return (
    <>
      <PageHeading page="accidents" />
      <div className="filter-row" aria-label="結果で絞り込み">
        <button className="chip" aria-pressed={outcome === 'all'} onClick={() => setOutcome('all')}>
          すべて
        </button>
        {accidentOutcomes.map((item) => (
          <button
            className="chip"
            aria-pressed={outcome === item.value}
            key={item.value}
            onClick={() => setOutcome(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="filter-row" aria-label="タグで絞り込み">
        <button className="chip" aria-pressed={tag === 'all'} onClick={() => setTag('all')}>
          すべてのタグ
        </button>
        {tags.map((item) => (
          <button
            className="chip"
            aria-pressed={tag === item}
            key={item}
            onClick={() => setTag(item)}
          >
            {item}
          </button>
        ))}
      </div>
      <div className="accident-list">
        {visible.map((accident) => (
          <AccidentCard accident={accident} key={accident.id} />
        ))}
      </div>
      {!visible.length && <p className="empty">公開中の事故事例はまだありません。</p>}
    </>
  );
}
