import { Fragment } from 'react';

const urlPattern = /(https?:\/\/[^\s]+)/g;

export function PlainText({ text }: { text: string }) {
  return (
    <>
      {text.split('\n').map((line, lineIndex) => (
        <Fragment key={`${lineIndex}-${line}`}>
          {line.split(urlPattern).map((part, index) =>
            /^https?:\/\//.test(part) ? (
              <a key={`${part}-${index}`} href={part} target="_blank" rel="noreferrer">
                {part}
              </a>
            ) : (
              <Fragment key={`${part}-${index}`}>{part}</Fragment>
            )
          )}
          {lineIndex < text.split('\n').length - 1 && <br />}
        </Fragment>
      ))}
    </>
  );
}
