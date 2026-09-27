import { describe, expect, it } from 'vitest';
import { filterBlocksForSummary } from './docView';

describe('filterBlocksForSummary', () => {
  it('shares the print key-point filter while retaining headings and signs', () => {
    expect(
      filterBlocksForSummary([
        { type: 'heading', text: '見出し' },
        { type: 'text', text: '本文' },
        { type: 'callout', tone: 'info', title: '要点', text: '内容' },
        { type: 'steps', items: [{ title: '手順', text: '内容' }] }
      ])
    ).toHaveLength(3);
  });
});
