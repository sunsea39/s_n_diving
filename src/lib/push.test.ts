import { afterEach, describe, expect, it, vi } from 'vitest';
import { base64UrlToUint8Array, getPushState, VAPID_PUBLIC_KEY } from './push';

describe('base64UrlToUint8Array', () => {
  it('converts the public VAPID key to bytes', () => {
    expect(base64UrlToUint8Array(VAPID_PUBLIC_KEY)).toHaveLength(65);
  });
});

describe('getPushState', () => {
  afterEach(() => vi.unstubAllGlobals());

  function mockPush({
    permission = 'default',
    subscription,
    registration = true
  }: {
    permission?: NotificationPermission;
    subscription?: object | null;
    registration?: boolean;
  }) {
    const notification = { permission };
    vi.stubGlobal('window', { PushManager: class PushManager {}, Notification: notification });
    vi.stubGlobal('Notification', notification);
    vi.stubGlobal('navigator', {
      serviceWorker: {
        getRegistration: vi
          .fn()
          .mockResolvedValue(
            registration
              ? { pushManager: { getSubscription: vi.fn().mockResolvedValue(subscription) } }
              : undefined
          )
      }
    });
  }

  it('reports unsupported when Push APIs are unavailable', async () => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('navigator', {});
    vi.stubGlobal('Notification', { permission: 'default' });
    await expect(getPushState()).resolves.toBe('unsupported');
  });

  it('reports blocked when notification permission was denied', async () => {
    mockPush({ permission: 'denied' });
    await expect(getPushState()).resolves.toBe('blocked');
  });

  it('reports on when the service worker has a subscription', async () => {
    mockPush({ subscription: {} });
    await expect(getPushState()).resolves.toBe('on');
  });

  it('reports off when no subscription is registered', async () => {
    mockPush({ registration: false });
    await expect(getPushState()).resolves.toBe('off');
  });
});
