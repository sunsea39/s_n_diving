import { resizeToJpeg } from './images';
import { requireSupabase } from './supabase';
import type { BoardCategory } from '../types';

export const boardCategories: Array<{ id: BoardCategory; label: string }> = [
  { id: 'hiyari', label: 'ヒヤリハット' },
  { id: 'plan', label: '計画' },
  { id: 'gear', label: '機材' },
  { id: 'chat', label: '雑談' }
];

export function categoryLabel(category: BoardCategory): string {
  return boardCategories.find((item) => item.id === category)?.label ?? category;
}

export async function uploadBoardImage(file: File, userId: string): Promise<string> {
  const resized = await resizeToJpeg(file);
  const path = `${userId}/${crypto.randomUUID()}.jpg`;
  const result = await requireSupabase()
    .storage.from('board-images')
    .upload(path, resized, { contentType: 'image/jpeg', upsert: false });
  if (result.error) throw result.error;
  return path;
}
