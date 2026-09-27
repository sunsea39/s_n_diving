import { requireSupabase } from './supabase';

export const VAPID_PUBLIC_KEY =
  'BLLJbbEOqCZ7KMHFDnh9miQw6uVatsh1h_e48vLCMcsafhrIPvbGETDhXQtYRHvyyYBp7N_sg82rtt586sqWnU4';

export function base64UrlToUint8Array(value: string): Uint8Array {
  const padding = '='.repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/');
  const bytes = atob(base64);
  return Uint8Array.from(bytes, (character) => character.charCodeAt(0));
}

export function supportsPush() {
  return 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
}

export function isIosHomeScreenRequired() {
  const ios = /iPad|iPhone|iPod/.test(navigator.userAgent);
  return ios && !('standalone' in navigator && navigator.standalone === true);
}

export async function enablePush(userId: string) {
  if (!supportsPush()) throw new Error('このブラウザは通知に対応していません。');
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('通知が許可されていません。');
  const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`, {
    scope: import.meta.env.BASE_URL
  });
  const subscription = await registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: base64UrlToUint8Array(VAPID_PUBLIC_KEY) as unknown as BufferSource
  });
  const json = subscription.toJSON();
  if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth)
    throw new Error('通知の登録情報を取得できませんでした。');
  const client = requireSupabase();
  await client
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', json.endpoint)
    .eq('user_id', userId);
  const { error } = await client.from('push_subscriptions').insert({
    user_id: userId,
    endpoint: json.endpoint,
    p256dh: json.keys.p256dh,
    auth: json.keys.auth,
    user_agent: navigator.userAgent
  });
  if (error) throw error;
}

export async function disablePush(userId: string) {
  const registration = await navigator.serviceWorker.getRegistration(import.meta.env.BASE_URL);
  const subscription = await registration?.pushManager.getSubscription();
  if (!subscription) return;
  const endpoint = subscription.endpoint;
  await subscription.unsubscribe();
  const { error } = await requireSupabase()
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', userId);
  if (error) throw error;
}

export async function sendPushTest() {
  const { error } = await requireSupabase().functions.invoke('send-push', { body: {} });
  if (error) throw error;
}
