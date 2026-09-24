export type Severity = 'stop' | 'check';
export type BoardCategory = 'hiyari' | 'plan' | 'gear' | 'chat';

export interface Sign {
  level: Severity;
  sign: string;
  why: string;
}

export interface EquipmentSection {
  no: number;
  name: string;
  sub: string;
  icon: string;
  guideline: string;
  signs: Sign[];
}

export interface Habit {
  title: string;
  text: string;
}

export interface DocBody {
  intro: string;
  sections: EquipmentSection[];
  habits: Habit[];
  disclaimer: string;
}

export interface DivingDoc {
  id?: string;
  slug: string;
  title: string;
  category: string;
  summary: string;
  icon?: string;
  body: DocBody;
  status: 'draft' | 'published';
  sort_order: number;
  updated_at?: string;
}

export interface NewsItem {
  id: string;
  title: string;
  body: string;
  next_dive_at: string | null;
  next_dive_place: string | null;
  pinned: boolean;
  published_at: string | null;
}

export interface HiyariFields {
  what: string;
  why: string;
  next: string;
}

export interface Thread {
  id: number;
  category: BoardCategory;
  title: string;
  body: string;
  hiyari: HiyariFields | null;
  image_path: string | null;
  author_name: string;
  author_uid: string;
  reply_count: number;
  last_post_at: string;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: number;
  thread_id: number;
  body: string;
  image_path: string | null;
  author_name: string;
  author_uid: string;
  hidden: boolean;
  created_at: string;
  updated_at: string;
}
