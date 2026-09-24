import { createContext, useContext } from 'react';
import type { User } from '@supabase/supabase-js';
import type { DivingDoc, NewsItem } from '../types';

export interface AppDataValue {
  configured: boolean;
  loading: boolean;
  docs: DivingDoc[];
  news: NewsItem[];
  disclaimer: string;
  user: User | null;
  isBoardMember: boolean;
  isAdmin: boolean;
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
