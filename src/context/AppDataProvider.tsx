import { useCallback, useEffect, useMemo, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import seedDocument from '../../supabase/seed/gear-signs.json';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import type { Accident, AccountRole, DivingDoc, NewsItem, PageText, Profile } from '../types';
import { AppDataContext } from './AppDataContext';

const fallbackDocs = [seedDocument as DivingDoc];

export function AppDataProvider({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<DivingDoc[]>(fallbackDocs);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [accidents, setAccidents] = useState<Accident[]>([]);
  const [disclaimer, setDisclaimer] = useState('');
  const [pageTexts, setPageTexts] = useState<
    Partial<Record<PageText['key'], Omit<PageText, 'key'>>>
  >({});
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AccountRole | null>(null);
  const [isBoardMember, setIsBoardMember] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isEditor, setIsEditor] = useState(false);
  const [isOwner, setIsOwner] = useState(false);
  const [authChecked, setAuthChecked] = useState(!isSupabaseConfigured);

  const refreshPublic = useCallback(async () => {
    if (!supabase) {
      setDocs(fallbackDocs);
      setNews([]);
      setAccidents([]);
      setDisclaimer('');
      setPageTexts({});
      setLoading(false);
      return;
    }

    setLoading(true);
    const [docResult, newsResult, settingsResult, accidentResult, textResult] = await Promise.all([
      supabase.from('docs').select('*').eq('status', 'published').order('sort_order'),
      supabase
        .from('news')
        .select('*')
        .order('pinned', { ascending: false })
        .order('published_at', { ascending: false }),
      supabase.from('public_settings').select('disclaimer').single(),
      supabase
        .from('accidents')
        .select('*')
        .eq('status', 'published')
        .order('occurred_on', { ascending: false }),
      supabase.from('page_texts').select('key,kicker,title,lead')
    ]);

    if (!docResult.error) setDocs(docResult.data as DivingDoc[]);
    if (!newsResult.error) setNews(newsResult.data as NewsItem[]);
    if (!settingsResult.error) setDisclaimer(settingsResult.data?.disclaimer ?? '');
    if (!accidentResult.error) setAccidents(accidentResult.data as Accident[]);
    if (!textResult.error)
      setPageTexts(
        Object.fromEntries((textResult.data as PageText[]).map(({ key, ...text }) => [key, text]))
      );
    setLoading(false);
  }, []);

  const refreshSession = useCallback(async () => {
    if (!supabase) return;

    const { data } = await supabase.auth.getSession();
    const currentUser = data.session?.user ?? null;
    setUser(currentUser);

    if (!currentUser) {
      setProfile(null);
      setRole(null);
      setIsBoardMember(false);
      setIsAdmin(false);
      setIsEditor(false);
      setIsOwner(false);
      setAuthChecked(true);
      return;
    }

    const [profileResult, membership, admin, editor, owner] = await Promise.all([
      supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
      supabase.rpc('is_member'),
      supabase.rpc('is_owner'),
      supabase.rpc('is_editor'),
      supabase.rpc('is_owner')
    ]);
    const nextProfile = profileResult.data as Profile | null;
    setProfile(nextProfile);
    setRole(nextProfile?.role ?? null);
    setIsBoardMember(Boolean(membership.data) && !membership.error);
    setIsAdmin(Boolean(admin.data) && !admin.error);
    setIsEditor(Boolean(editor.data) && !editor.error);
    setIsOwner(Boolean(owner.data) && !owner.error);
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
      accidents,
      disclaimer,
      pageTexts,
      user,
      profile,
      role,
      isBoardMember,
      isAdmin,
      isEditor,
      isOwner,
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
      isEditor,
      isOwner,
      loading,
      news,
      profile,
      pageTexts,
      accidents,
      refreshPublic,
      refreshSession,
      role,
      user
    ]
  );

  return <AppDataContext.Provider value={value}>{children}</AppDataContext.Provider>;
}
