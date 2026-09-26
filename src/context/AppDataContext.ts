import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Accident, AccountRole, DivingDoc, NewsItem, PageText, Profile } from '../types';

export interface AppDataValue {
  configured: boolean;
  loading: boolean;
  docs: DivingDoc[];
  news: NewsItem[];
  accidents: Accident[];
  disclaimer: string;
  pageTexts: Partial<Record<PageText['key'], Omit<PageText, 'key'>>>;
  user: User | null;
  profile: Profile | null;
  role: AccountRole | null;
  isBoardMember: boolean;
  isAdmin: boolean;
  isEditor: boolean;
  isOwner: boolean;
  authChecked: boolean;
  refreshPublic: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

export const AppDataContext = createContext<AppDataValue | null>(null);

export function useAppData(): AppDataValue {
  const value = useContext(AppDataContext);
  if (!value) throw new Error('AppDataProvider の外側では利用できません。');
  return value;
}
