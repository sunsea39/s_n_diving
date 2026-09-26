import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { accidentOutcomeMeta, accidentOutcomes, sortAndFilterAccidents } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';
import type { AccidentOutcome } from '../types';

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
      <p className="kicker">事故事例</p>
      <h1>事故から学ぶ</h1>
      <p className="lead">なぜ起きたか、どうすれば防げたかを考えるための事例です。</p>
      <div className="filter-row" aria-label="結果で絞り込み">
        <button className={outcome === 'all' ? 'selected' : ''} onClick={() => setOutcome('all')}>
          すべて
        </button>
        {accidentOutcomes.map((item) => (
          <button
            className={outcome === item.value ? 'selected' : ''}
            key={item.value}
            onClick={() => setOutcome(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="filter-row" aria-label="タグで絞り込み">
        <button className={tag === 'all' ? 'selected' : ''} onClick={() => setTag('all')}>
          すべてのタグ
        </button>
        {tags.map((item) => (
          <button
            className={tag === item ? 'selected' : ''}
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
