import { describe, expect, it } from 'vitest';
import { detectPushGuideDevice } from './pushGuide';

describe('detectPushGuideDevice', () => {
  it('chooses the iPhone guide for iPhone browsers', () => {
    expect(detectPushGuideDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe(
      'iphone'
    );
  });

  it('chooses the Android guide for Android browsers', () => {
    expect(detectPushGuideDevice('Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit')).toBe(
      'android'
    );
  });

  it('uses the iPhone guide for other devices', () => {
    expect(detectPushGuideDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('iphone');
  });
});
