import webpush from 'npm:web-push@3.6.7';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SITE_ORIGIN = 'https://sunsea39.github.io';
const SITE_URL = `${SITE_ORIGIN}/s_n_diving`;

function corsHeaders(request: Request) {
  const origin = request.headers.get('origin');
  let allowed = origin === SITE_ORIGIN;
  if (origin) {
    try {
      const url = new URL(origin);
      allowed ||= url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1');
    } catch {
      allowed = false;
    }
  }
  return allowed && origin
    ? {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Headers': 'authorization, content-type, x-push-secret',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        Vary: 'Origin'
      }
    : {};
}

async function constantTimeEqual(left: string, right: string) {
  const encoder = new TextEncoder();
  const [leftHash, rightHash] = await Promise.all([
    crypto.subtle.digest('SHA-256', encoder.encode(left)),
    crypto.subtle.digest('SHA-256', encoder.encode(right))
  ]);
  const a = new Uint8Array(leftHash);
  const b = new Uint8Array(rightHash);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

function json(body: unknown, status = 200, headers: HeadersInit = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers }
  });
}

Deno.serve(async (request) => {
  const cors = corsHeaders(request);
  if (request.method === 'OPTIONS') return new Response(null, { headers: cors });
  if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, cors);

  const url = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const webhookSecret = Deno.env.get('PUSH_WEBHOOK_SECRET');
  const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY');
  const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY');
  const vapidSubject = Deno.env.get('VAPID_SUBJECT');
  if (!url || !serviceRoleKey || !webhookSecret || !vapidPublicKey || !vapidPrivateKey || !vapidSubject)
    return json({ error: 'Push delivery is not configured' }, 503, cors);

  webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);
  const service = createClient(url, serviceRoleKey, { auth: { persistSession: false } });
  let input: { event_id?: number | string } = {};
  try {
    input = (await request.json()) as { event_id?: number | string };
  } catch {
    // A signed-in member may send an empty body for a test notification.
  }

  const providedSecret = request.headers.get('x-push-secret');
  let targetUserId: string | null = null;
  let payload: { title: string; body: string; url: string; tag: string } | null = null;

  if (providedSecret && (await constantTimeEqual(providedSecret, webhookSecret))) {
    const eventId = Number(input.event_id);
    if (!Number.isSafeInteger(eventId) || eventId < 1)
      return json({ error: 'event_id is required' }, 400, cors);
    const { data: event, error } = await service
      .from('notification_events')
      .select('id,kind,ref_id,title,body,url,audience')
      .eq('id', eventId)
      .maybeSingle();
    if (error || !event || event.audience !== 'members') return json({ error: 'Event not found' }, 404, cors);
    payload = {
      title: event.title,
      body: event.body,
      url: `${SITE_URL}${event.url}`,
      tag: `${event.kind}:${event.ref_id}`
    };
  } else {
    const authorization = request.headers.get('authorization') ?? '';
    const token = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
    if (!token) return json({ error: 'Unauthorized' }, 401, cors);
    const { data: authData, error: authError } = await service.auth.getUser(token);
    if (authError || !authData.user) return json({ error: 'Unauthorized' }, 401, cors);
    const { data: profile } = await service
      .from('profiles')
      .select('role')
      .eq('id', authData.user.id)
      .maybeSingle();
    if (!profile || !['member', 'editor', 'owner'].includes(profile.role))
      return json({ error: 'Members only' }, 403, cors);
    targetUserId = authData.user.id;
    payload = { title: 'テスト通知', body: '通知は正しく設定されています。', url: SITE_URL, tag: `test:${targetUserId}` };
  }

  const subscriptionsQuery = service.from('push_subscriptions').select('id,user_id,endpoint,p256dh,auth');
  const { data: subscriptions, error: subscriptionsError } = targetUserId
    ? await subscriptionsQuery.eq('user_id', targetUserId)
    : await subscriptionsQuery;
  if (subscriptionsError) return json({ error: subscriptionsError.message }, 500, cors);

  // Deliver only to people who are approved members right now (a suspended user keeps no access).
  const { data: members, error: membersError } = await service
    .from('profiles')
    .select('id')
    .in('role', ['member', 'editor', 'owner']);
  if (membersError) return json({ error: membersError.message }, 500, cors);
  const memberIds = new Set((members ?? []).map((member) => member.id));

  let sent = 0;
  for (const subscription of (subscriptions ?? []).filter((item) => memberIds.has(item.user_id))) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth }
        },
        JSON.stringify(payload)
      );
      await service.from('push_subscriptions').update({ last_success_at: new Date().toISOString() }).eq('id', subscription.id);
      sent += 1;
    } catch (cause) {
      const statusCode = typeof cause === 'object' && cause ? (cause as { statusCode?: number }).statusCode : undefined;
      if (statusCode === 404 || statusCode === 410)
        await service.from('push_subscriptions').delete().eq('id', subscription.id);
    }
  }
  return json({ ok: true, sent }, 200, cors);
});
