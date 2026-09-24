import { useEffect, useState } from 'react';
import { requireSupabase } from '../lib/supabase';

export function BoardImage({ path }: { path: string | null }) {
  const [url, setUrl] = useState('');

  useEffect(() => {
    setUrl('');
    if (!path) return;
    void requireSupabase()
      .storage.from('board-images')
      .createSignedUrl(path, 3600)
      .then(({ data }) => setUrl(data?.signedUrl ?? ''));
  }, [path]);

  return url ? <img className="board-image" src={url} alt="投稿された画像" /> : null;
}
