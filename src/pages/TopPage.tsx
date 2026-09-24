import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { DocCard } from '../components/DocContent';
import { ThreadRow } from '../components/ThreadRow';
import { useAppData } from '../context/AppDataContext';
import { formatNextDive, relativeDate, selectNextDive } from '../lib/logic';
import { requireSupabase } from '../lib/supabase';
import { usePageTitle } from '../lib/pageTitle';
import type { Thread } from '../types';

function RecentThreads() {
  const { configured, isBoardMember } = useAppData();
  const [threads, setThreads] = useState<Thread[]>([]);

  useEffect(() => {
    if (!configured || !isBoardMember) return;
    void requireSupabase()
      .from('threads')
      .select('*')
      .order('last_post_at', { ascending: false })
      .limit(3)
      .then(({ data }) => setThreads((data ?? []) as Thread[]));
  }, [configured, isBoardMember]);

  if (!isBoardMember) {
    return <p className="empty">掲示板は合言葉を入力した仲間だけが見られます。</p>;
  }
  return threads.length ? (
    <div className="thread-list">
      {threads.map((thread) => (
        <ThreadRow key={thread.id} thread={thread} />
      ))}
    </div>
  ) : (
    <p className="empty">まだ投稿はありません。</p>
  );
}

export function TopPage() {
  usePageTitle('ホーム');
  const { docs, news, isBoardMember, loading } = useAppData();
  const nextDive = selectNextDive(news);

  return (
    <>
      <section className="hero">
        <p className="kicker">仲間内の安全情報</p>
        <h1>安全に、気持ちよく潜るために。</h1>
        <p>潜る前の機材チェックと、仲間どうしの小さな気づきをここに残します。</p>
        <div className="next-dive">
          <span className="next-dive-kicker">NEXT DIVE</span>
          {nextDive ? (
            <p>
              <b>{formatNextDive(nextDive.next_dive_at as string)}</b>
              {nextDive.next_dive_place && <span> ・ {nextDive.next_dive_place}</span>}
            </p>
          ) : (
            <p>次回の予定は未定です。</p>
          )}
        </div>
        <div className="button-row">
          <Link className="button" to="/docs">
            資料を見る
          </Link>
          {isBoardMember ? (
            <Link className="button-secondary" to="/board">
              掲示板を見る
            </Link>
          ) : (
            <Link className="button-secondary" to="/join?next=/board">
              合言葉を入れて見る
            </Link>
          )}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>お知らせ</h2>
        </div>
        {loading ? (
          <p>読み込み中です…</p>
        ) : news.slice(0, 3).length ? (
          <div className="news-list">
            {news.slice(0, 3).map((item) => (
              <Link className="panel news-row" to={`/news/${item.id}`} key={item.id}>
                <span className="meta">
                  {item.pinned && '固定 ・ '}
                  {item.published_at ? relativeDate(item.published_at) : ''}
                </span>
                <b>{item.title}</b>
              </Link>
            ))}
          </div>
        ) : (
          <p className="empty">お知らせはまだありません。</p>
        )}
      </section>

      <section>
        <div className="section-heading">
          <h2>資料</h2>
          <Link to="/docs">一覧へ</Link>
        </div>
        <div className="card-grid">
          {docs.slice(0, 3).map((doc) => (
            <DocCard doc={doc} key={doc.slug} />
          ))}
        </div>
      </section>

      <section>
        <div className="section-heading">
          <h2>掲示板の新着</h2>
          <Link to={isBoardMember ? '/board' : '/join?next=/board'}>
            {isBoardMember ? '一覧へ' : '合言葉を入れて見る'}
          </Link>
        </div>
        <RecentThreads />
      </section>
    </>
  );
}
