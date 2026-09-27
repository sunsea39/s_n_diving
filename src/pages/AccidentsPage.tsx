import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { accidentOutcomeMeta, accidentOutcomes, sortAndFilterAccidents } from '../lib/logic';
import { usePageTitle } from '../lib/pageTitle';
import type { AccidentOutcome } from '../types';
import { PageHeading } from '../components/PageHeading';
import { isContentRead, markContentRead } from '../lib/contentReads';
import { requireSupabase } from '../lib/supabase';

export function AccidentCard({
  accident,
  isRead,
  showReadStatus = false
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
  isRead?: boolean;
  showReadStatus?: boolean;
}) {
  const outcome = accidentOutcomeMeta(accident.outcome);
  return (
    <Link className="panel accident-card" to={'/accidents/' + accident.slug}>
      <span className={'outcome-badge ' + outcome.className}>{outcome.label}</span>
      {showReadStatus && (
        <span className={'read-badge ' + (isRead ? 'read' : 'unread')}>
          {isRead ? '確認済み' : '未確認'}
        </span>
      )}
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
  const { accidents, contentReads, profile, refreshContentReads, user } = useAppData();
  const [outcome, setOutcome] = useState<AccidentOutcome | 'all'>('all');
  const [tag, setTag] = useState('all');
  const [unreadOnly, setUnreadOnly] = useState(false);
  const tags = [...new Set(accidents.flatMap((accident) => accident.tags))].sort();
  const visible = useMemo(
    () =>
      sortAndFilterAccidents(accidents, { outcome, tag }).filter(
        (accident) => !unreadOnly || !isContentRead(contentReads, 'accident', accident.id)
      ),
    [accidents, contentReads, outcome, tag, unreadOnly]
  );
  const unreadCount = accidents.filter(
    (accident) => !isContentRead(contentReads, 'accident', accident.id)
  ).length;

  useEffect(() => {
    if (!user || !profile) return;
    let cancelled = false;
    void requireSupabase()
      .from('notification_events')
      .select('ref_id')
      .eq('kind', 'accident_batch')
      .gt('created_at', profile.notifications_seen_at)
      .then(async ({ data }) => {
        if (cancelled) return;
        await Promise.all(
          (data ?? []).map((event) => markContentRead('accident_batch', event.ref_id))
        );
        if (!cancelled && data?.length) await refreshContentReads();
      });
    return () => {
      cancelled = true;
    };
  }, [profile, refreshContentReads, user]);
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
      {user && (
        <div className="accident-read-controls">
          <b>未確認 {unreadCount} 件</b>
          <button
            className="chip"
            aria-pressed={unreadOnly}
            onClick={() => setUnreadOnly((value) => !value)}
          >
            未確認のみ
          </button>
        </div>
      )}
      <div className="accident-list">
        {visible.map((accident) => (
          <AccidentCard
            accident={accident}
            isRead={isContentRead(contentReads, 'accident', accident.id)}
            key={accident.id}
            showReadStatus={Boolean(user)}
          />
        ))}
      </div>
      {!visible.length && <p className="empty">公開中の事故事例はまだありません。</p>}
    </>
  );
}
