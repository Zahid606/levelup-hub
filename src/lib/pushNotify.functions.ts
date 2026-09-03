import { createServerFn } from '@tanstack/react-start';
import { getRequestHeader } from '@tanstack/react-start/server';
import { createClient } from '@supabase/supabase-js';

interface PushInput {
  title: string;
  body: string;
  url: string;
  tag?: string;
  /** When omitted, the push goes to every student. */
  user_ids?: string[];
}

function validate(input: unknown): PushInput {
  const raw = input as Partial<PushInput> | null;
  if (!raw?.title || !raw.body || !raw.url) {
    throw new Error('title, body and url are required');
  }
  return {
    title: String(raw.title).slice(0, 120),
    body: String(raw.body).slice(0, 300),
    url: String(raw.url).slice(0, 300),
    ...(raw.tag ? { tag: String(raw.tag).slice(0, 120) } : {}),
    ...(Array.isArray(raw.user_ids) ? { user_ids: raw.user_ids.slice(0, 5000) } : {}),
  };
}

/** Sends a Web Push message to students' registered devices (works when the app is closed). */
export const sendPushToStudents = createServerFn({ method: 'POST' })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const supabaseUrl = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
    const serviceRoleKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    const vapidPublic = process.env['VAPID_PUBLIC_KEY'];
    const vapidPrivate = process.env['VAPID_PRIVATE_KEY'];
    const subject = process.env['VAPID_SUBJECT'] ?? 'mailto:admin@example.com';
    if (!supabaseUrl || !serviceRoleKey) throw new Error('Server is not configured');
    if (!vapidPublic || !vapidPrivate) throw new Error('Push keys are not configured');

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // --- authorize the caller: staff only ---
    const authHeader = getRequestHeader('Authorization');
    if (!authHeader?.startsWith('Bearer ')) throw new Error('Unauthorized');
    const {
      data: { user: caller },
    } = await admin.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!caller) throw new Error('Unauthorized');
    const { data: callerRoles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', caller.id);
    const roles = (callerRoles || []).map((r: { role: string }) => r.role);
    if (!roles.some((r) => r === 'admin' || r === 'manager' || r === 'volunteer')) {
      throw new Error('Forbidden');
    }

    // --- resolve target users ---
    let targets = data.user_ids ?? [];
    if (targets.length === 0) {
      const { data: students } = await admin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'student');
      targets = (students || []).map((s: { user_id: string }) => s.user_id);
    }
    if (targets.length === 0) return { sent: 0, removed: 0 };

    const { data: subs } = await admin
      .from('push_subscriptions')
      .select('id,endpoint,p256dh,auth')
      .in('user_id', targets);
    const subscriptions = (subs || []) as Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>;
    if (subscriptions.length === 0) return { sent: 0, removed: 0 };

    const { setWebCrypto, ApplicationServerKeys, generatePushHTTPRequest } = await import(
      'webpush-webcrypto'
    );
    setWebCrypto(globalThis.crypto);
    const keys = await ApplicationServerKeys.fromJSON({
      publicKey: vapidPublic,
      privateKey: vapidPrivate,
    });

    const payload = JSON.stringify({
      title: data.title,
      body: data.body,
      url: data.url,
      tag: data.tag ?? undefined,
      actionLabel: 'Watch Now',
    });

    const stale: string[] = [];
    let sent = 0;

    // Send in small batches so a large student list doesn't stall the request.
    const batchSize = 25;
    for (let i = 0; i < subscriptions.length; i += batchSize) {
      const batch = subscriptions.slice(i, i + batchSize);
      await Promise.all(
        batch.map(async (sub) => {
          try {
            const req = await generatePushHTTPRequest({
              payload,
              applicationServerKeys: keys,
              target: { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
              adminContact: subject,
              ttl: 60 * 60 * 24,
              urgency: 'normal',
            });
            const res = await fetch(req.endpoint, {
              method: 'POST',
              headers: req.headers,
              body: req.body as BodyInit,
            });
            if (res.status === 404 || res.status === 410) {
              stale.push(sub.id);
            } else if (res.ok) {
              sent += 1;
            } else {
              console.error(`push failed [${res.status}]: ${await res.text()}`);
            }
          } catch (err) {
            console.error('push send error', err);
          }
        }),
      );
    }

    if (stale.length > 0) {
      await admin.from('push_subscriptions').delete().in('id', stale);
    }

    return { sent, removed: stale.length };
  });
