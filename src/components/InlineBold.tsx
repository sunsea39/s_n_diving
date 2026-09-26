import { Fragment } from 'react';
import { parseBoldSegments } from '../lib/bold';

export function InlineBold({ text }: { text: string }) {
  return (
    <>
      {parseBoldSegments(text).map((segment, index) =>
        segment.bold ? (
          <strong key={index}>{segment.text}</strong>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        )
      )}
    </>
  );
}
