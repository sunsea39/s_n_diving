import { filterBlocksForPrint } from './print';
import type { Block } from '../types';

export const DOC_VIEW_STORAGE_KEY = 'ns-doc-view';
export type DocView = 'full' | 'summary';

export function readDocView(search: string): DocView {
  if (new URLSearchParams(search).get('view') === 'summary') return 'summary';
  try {
    return localStorage.getItem(DOC_VIEW_STORAGE_KEY) === 'summary' ? 'summary' : 'full';
  } catch {
    return 'full';
  }
}

export function filterBlocksForSummary(blocks: Block[]) {
  return blocks.filter(
    (block) =>
      block.type === 'heading' ||
      block.type === 'signs' ||
      filterBlocksForPrint([block], 'key').length > 0
  );
}
