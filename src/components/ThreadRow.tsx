import { Link } from 'react-router-dom';
import { categoryLabel } from '../lib/board';
import { relativeDate } from '../lib/logic';
import type { Thread } from '../types';
import { Avatar } from './Avatar';

export function ThreadRow({ thread }: { thread: Thread }) {
  return (
    <Link className="panel thread-row" to={`/board/${thread.id}`}>
      <span className={`category ${thread.category}`}>{categoryLabel(thread.category)}</span>
      <b>{thread.title}</b>
      <span className="meta author-meta">
        <Avatar
          link
          id={thread.profile?.id}
          name={thread.profile?.display_name ?? thread.author_name}
          path={thread.profile?.avatar_path}
          small
        />
        {thread.profile?.display_name ?? thread.author_name} ・ {relativeDate(thread.last_post_at)}{' '}
        ・ 返信 {thread.reply_count}件
      </span>
    </Link>
  );
}
