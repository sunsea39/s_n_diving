import { describe, expect, it } from 'vitest';
import { base64UrlToUint8Array, VAPID_PUBLIC_KEY } from './push';

describe('base64UrlToUint8Array', () => {
  it('converts the public VAPID key to bytes', () => {
    expect(base64UrlToUint8Array(VAPID_PUBLIC_KEY)).toHaveLength(65);
  });
});
