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

export type CalloutTone = 'info' | 'caution' | 'danger';

export type Block =
  | { type: 'heading'; text: string }
  | { type: 'text'; text: string }
  | { type: 'callout'; tone: CalloutTone; title: string; text: string }
  | { type: 'signs'; sections: EquipmentSection[] }
  | { type: 'cards'; columns: 2 | 3; items: { icon?: string; title: string; text: string }[] }
  | { type: 'steps'; items: { title: string; text: string }[] }
  | { type: 'checklist'; title: string; items: { text: string; level?: Severity }[] }
  | { type: 'table'; headers: string[]; rows: string[][] }
  | { type: 'image'; src: string; alt: string; caption: string }
  | { type: 'qa'; items: { q: string; a: string }[] }
  | { type: 'links'; items: { label: string; url: string }[] };

export interface DocBody {
  intro: string;
  blocks: Block[];
  disclaimer: string;
}

export interface LegacyDocBody {
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
  body: DocBody | LegacyDocBody;
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

export type AccidentOutcome = 'fatal' | 'serious' | 'minor' | 'near_miss';

export interface AccidentTimelineItem {
  time: string;
  text: string;
}

export interface AccidentSource {
  label: string;
  url: string;
}

export interface Accident {
  id: string;
  slug: string;
  title: string;
  occurred_on: string | null;
  occurred_label: string;
  location: string;
  dive_style: string;
  outcome: AccidentOutcome;
  tags: string[];
  summary: string;
  timeline: AccidentTimelineItem[];
  causes: string[];
  lessons: string[];
  related_doc_slugs: string[];
  sources: AccidentSource[];
  status: 'draft' | 'published';
  created_at?: string;
  updated_at?: string;
  updated_by?: string | null;
}
