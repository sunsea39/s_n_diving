import { describe, expect, it } from 'vitest';
import { isContentRead, unreadNotificationEvents } from './contentReads';
import type { ContentRead, NotificationEvent } from '../types';

const baseline = '2026-10-02T00:00:00.000Z';
const events: NotificationEvent[] = [
  {
    id: 3,
    kind: 'accident_batch',
    ref_id: '00000000-0000-0000-0000-000000000003',
    audience: 'members',
    title: '事故事例を 3 件追加しました',
    body: '',
    url: '/accidents',
    created_at: '2026-10-04T00:00:00.000Z'
  },
  {
    id: 2,
    kind: 'accident',
    ref_id: '00000000-0000-0000-0000-000000000002',
    audience: 'members',
    title: '事故事例',
    body: '',
    url: '/accidents/example',
    created_at: '2026-10-03T00:00:00.000Z'
  },
  {
    id: 1,
    kind: 'news',
    ref_id: '00000000-0000-0000-0000-000000000001',
    audience: 'members',
    title: '過去のお知らせ',
    body: '',
    url: '/news/old',
    created_at: '2026-10-01T00:00:00.000Z'
  }
];

describe('v2.9 content reads', () => {
  it('keeps events at or before the legacy baseline out of unread notifications', () => {
    expect(unreadNotificationEvents(events, [], baseline).map((event) => event.id)).toEqual([3, 2]);
  });

  it('removes an opened article but leaves other notifications unread', () => {
    const reads: ContentRead[] = [
      {
        user_id: '00000000-0000-0000-0000-000000000099',
        kind: 'accident',
        ref_id: events[1].ref_id,
        read_at: '2026-10-03T01:00:00.000Z'
      }
    ];
    expect(unreadNotificationEvents(events, reads, baseline).map((event) => event.id)).toEqual([3]);
  });

  it('tracks an accident batch separately from an individual accident', () => {
    const reads: ContentRead[] = [
      {
        user_id: '00000000-0000-0000-0000-000000000099',
        kind: 'accident_batch',
        ref_id: events[0].ref_id,
        read_at: '2026-10-04T01:00:00.000Z'
      }
    ];
    expect(isContentRead(reads, 'accident_batch', events[0].ref_id)).toBe(true);
    expect(isContentRead(reads, 'accident', events[1].ref_id)).toBe(false);
  });
});
