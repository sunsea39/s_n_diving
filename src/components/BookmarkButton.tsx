import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppData } from '../context/AppDataContext';
import { requireSupabase } from '../lib/supabase';

export function BookmarkButton({
  docSlug,
  anchor = '',
  label,
  small = false
}: {
  docSlug: string;
  anchor?: string;
  label: string;
  small?: boolean;
}) {
  const { user } = useAppData();
  const navigate = useNavigate();
  const [id, setId] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!user) return;
    void requireSupabase()
      .from('bookmarks')
      .select('id')
      .eq('user_id', user.id)
      .eq('doc_slug', docSlug)
      .eq('anchor', anchor)
      .maybeSingle()
      .then(({ data }) => setId(data?.id ?? null));
  }, [anchor, docSlug, user]);
  const toggle = async () => {
    if (!user) {
      setMessage('ログインするとブックマークできます');
      setTimeout(
        () =>
          navigate(
            `/login?next=${encodeURIComponent(`/docs/${docSlug}${anchor ? `#${anchor}` : ''}`)}`
          ),
        700
      );
      return;
    }
    const client = requireSupabase();
    const result = id
      ? await client.from('bookmarks').delete().eq('id', id)
      : await client
          .from('bookmarks')
          .insert({ user_id: user.id, doc_slug: docSlug, anchor, label })
          .select('id')
          .single();
    if (!result.error) {
      setId(id ? null : (result.data?.id ?? null));
      setMessage(id ? 'ブックマークを外しました' : 'ブックマークしました');
      setTimeout(() => setMessage(''), 1800);
    }
  };
  return (
    <span className="bookmark-control">
      <button
        className={`bookmark-button${small ? ' small' : ''}`}
        aria-pressed={!!id}
        aria-label={`${label}をブックマーク`}
        onClick={() => void toggle()}
      >
        {id ? '★' : '☆'}
      </button>
      {message && (
        <span className="bookmark-toast" role="status">
          {message}
        </span>
      )}
    </span>
  );
}
