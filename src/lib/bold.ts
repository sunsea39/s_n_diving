export type BoldSegment = { text: string; bold: boolean };

/**
 * Interprets only paired Markdown bold markers. Rendering the result as React
 * text nodes keeps source content (including HTML-like text) escaped.
 */
export function parseBoldSegments(text: string): BoldSegment[] {
  const segments: BoldSegment[] = [];
  const matcher = /\*\*([\s\S]+?)\*\*/g;
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = matcher.exec(text))) {
    if (match.index > cursor) segments.push({ text: text.slice(cursor, match.index), bold: false });
    segments.push({ text: match[1], bold: true });
    cursor = match.index + match[0].length;
  }
  if (cursor < text.length || segments.length === 0) {
    segments.push({ text: text.slice(cursor), bold: false });
  }
  return segments;
}
