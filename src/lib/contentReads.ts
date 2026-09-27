import { requireSupabase } from './supabase';
import type { ContentRead, NotificationEvent } from '../types';

export type ReadableContentKind = ContentRead['kind'];

export function isContentRead(reads: ContentRead[], kind: ReadableContentKind, refId: string) {
  return reads.some((read) => read.kind === kind && read.ref_id === refId);
}

export function unreadNotificationEvents(
  events: NotificationEvent[],
  reads: ContentRead[],
  baseline: string,
  limit = 20
) {
  return events
    .filter(
      (event) => event.created_at > baseline && !isContentRead(reads, event.kind, event.ref_id)
    )
    .slice(0, limit);
}

export async function markContentRead(kind: ReadableContentKind, refId: string) {
  const client = requireSupabase();
  const { data: auth } = await client.auth.getUser();
  if (!auth.user) return;
  await client
    .from('content_reads')
    .upsert(
      { user_id: auth.user.id, kind, ref_id: refId },
      { onConflict: 'user_id,kind,ref_id', ignoreDuplicates: true }
    );
}
