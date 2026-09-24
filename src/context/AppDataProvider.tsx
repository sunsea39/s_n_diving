import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import seedDocument from '../../supabase/seed/gear-signs.json';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { DivingDoc, NewsItem } from '../types';
import { AppDataContext } from './AppDataContext';

const fallbackDocs = [seedDocument as DivingDoc];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<DivingDoc[]>(fallbackDocs);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [isBoardMember, setIsBoardMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);

  const refreshPublic = useCallback(async () => {
    if (!supabase) {
      setDocs(fallbackDocs);
      setNews([]);
      setDisclaimer('');
      setLoading(false);
      return;
    }

    setLoading(true);
    const [docResult, newsResult, settingsResult] = await Promise.all([
      supabase.from('docs').select('*').eq('status', 'published').order('sort_order'),
      supabase
        .from('news')
        .select('*')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false }),
      supabase.from('public_settings').select('disclaimer').single()
    ]);

    if (!docResult.error) setDocs(docResult.data as DivingDoc[]);
    if (!newsResult.error) setNews(newsResult.data as NewsItem[]);
    if (!settingsResult.error) setDisclaimer(settingsResult.data?.disclaimer ?? '');
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) return;

    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user ?? null;
    setUser(currentUser);

    if (!currentUser) {
      setIsBoardMember(false);
      setIsAdmin(false);
      setAuthChecked(true);
      return;
    }

    const [membership, admin] = await Promise.all([
      supabase.rpc('is_board_member'),
      supabase.rpc('is_admin')
    ]);
    setIsBoardMember(Boolean(membership.data) && !membership.error);
    setIsAdmin(Boolean(admin.data) && !admin.error);
    setAuthChecked(true);
  }, []);

  useEffect(() => {
    void refreshPublic();
    void refreshSession();

    if (!supabase) return undefined;
    const { data } = supabase.auth.onAuthStateChange(() => void refreshSession());
    return () => data.subscription.unsubscribe();
  }, [refreshPublic, refreshSession]);

  const value = useMemo(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      docs,
      news,
      disclaimer,
      user,
      isBoardMember,
      isAdmin,
      authChecked,
      refreshPublic,
      refreshSession
    }),
    [
      authChecked,
      disclaimer,
      docs,
      isAdmin,
      isBoardMember,
      loading,
      news,
      refreshPublic,
      refreshSession,
      user
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
