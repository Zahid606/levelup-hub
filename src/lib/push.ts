import { supabase } from '@/integrations/supabase/client';

// Public VAPID application server key (safe to ship to the browser).
export const VAPID_PUBLIC_KEY =
  'BI_YCFNTJBQucXEMqn-4YUWdpvomeJGSTx7XPXI-fzOnkS4-pqZeHymuLGx8LXDRsLd_wvMSs624k62BIbUj9fU';

export type PushStatus =
  | 'subscribed'
  | 'unsupported'
  | 'open-in-new-tab'
  | 'denied'
  | 'error';

export type PushPermissionState = 'unsupported' | 'default' | 'denied' | 'enabled' | 'unregistered';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const output = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) output[i] = raw.charCodeAt(i);
  return output;
}

function bufferToBase64Url(buffer: ArrayBuffer | null): string {
  if (!buffer) return '';
  const bytes = new Uint8Array(buffer);
  let binary = '';
  bytes.forEach((b) => { binary += String.fromCharCode(b); });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function pushSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    'serviceWorker' in navigator &&
    'PushManager' in window &&
    'Notification' in window
  );
}

export function getPushPermission(): NotificationPermission | 'unsupported' {
  return pushSupported() ? Notification.permission : 'unsupported';
}

async function getPushRegistration(): Promise<ServiceWorkerRegistration | undefined> {
  const registrations = await navigator.serviceWorker.getRegistrations();
  return registrations.find((item) => item.scope === `${window.location.origin}/`);
}

async function waitForActiveWorker(registration: ServiceWorkerRegistration) {
  if (registration.active) return;
  const worker = registration.installing ?? registration.waiting;
  if (!worker) return;
  await new Promise<void>((resolve) => {
    const timeout = window.setTimeout(resolve, 5_000);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'activated' || worker.state === 'redundant') {
        window.clearTimeout(timeout);
        resolve();
      }
    });
  });
}

/** Registers the device for background push. Must be called from a user gesture. */
export async function enablePush(userId: string): Promise<PushStatus> {
  if (!pushSupported()) return 'unsupported';
  // Browsers block permission prompts inside cross-origin iframes (Lovable preview).
  if (window.top !== window.self) return 'open-in-new-tab';

  try {
    const permission =
      Notification.permission === 'granted'
        ? 'granted'
        : await Notification.requestPermission();
    if (permission !== 'granted') return 'denied';

    const registration =
      (await getPushRegistration()) ??
      (await navigator.serviceWorker.register('/push-sw.js', { scope: '/' }));
    await waitForActiveWorker(registration);

    const appServerKey = urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource;
    let existing = await registration.pushManager.getSubscription();
    // A subscription created with a different VAPID key can never be delivered
    // to, so drop it and re-subscribe with the current key.
    if (existing && bufferToBase64Url(existing.options.applicationServerKey ?? null) !== VAPID_PUBLIC_KEY) {
      try { await existing.unsubscribe(); } catch { /* ignore */ }
      existing = null;
    }


    // A browser subscription may survive signing out. Re-create it when it is
    // not registered to the current account, otherwise the unique endpoint can
    // remain attached to the previous user and silently block registration.
    if (existing) {
      const { data, error } = await supabase
        .from('push_subscriptions')
        .select('id')
        .eq('user_id', userId)
        .eq('endpoint', existing.endpoint)
        .maybeSingle();
      if (error) throw error;
      if (!data) {
        await existing.unsubscribe();
        existing = null;
      }
    }
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: appServerKey,
      }));

    const p256dh = bufferToBase64Url(subscription.getKey('p256dh'));
    const auth = bufferToBase64Url(subscription.getKey('auth'));
    if (!p256dh || !auth) return 'error';

    const { error } = await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent.slice(0, 300),
      } as never,
      { onConflict: 'endpoint' },
    );
    if (error) throw error;

    return 'subscribed';
  } catch (err) {
    console.error('push registration failed', err);
    return 'error';
  }
}

/** True when this device currently has an active push subscription. */
export async function isPushEnabled(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const registration = await getPushRegistration();
    if (!registration) return false;
    const sub = await registration.pushManager.getSubscription();
    return !!sub;
  } catch {
    return false;
  }
}

/** Returns the browser's real permission and device registration state. */
export async function getPushState(userId?: string): Promise<PushPermissionState> {
  const permission = getPushPermission();
  if (permission === 'unsupported') return 'unsupported';
  if (permission === 'default') return 'default';
  if (permission === 'denied') return 'denied';

  try {
    const registration = await getPushRegistration();
    const subscription = await registration?.pushManager.getSubscription();
    if (!subscription) return 'unregistered';
    if (!userId) return 'enabled';
    const { data, error } = await supabase
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('endpoint', subscription.endpoint)
      .maybeSingle();
    if (error) return 'unregistered';
    return data ? 'enabled' : 'unregistered';
  } catch {
    return 'unregistered';
  }
}

/** Turns off push for this device and forgets the stored subscription. */
export async function disablePush(): Promise<void> {
  if (!pushSupported()) return;
  try {
    const registration = await getPushRegistration();
    const sub = await registration?.pushManager.getSubscription();
    if (sub) {
      const { error } = await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
      if (error) throw error;
      await sub.unsubscribe();
    }
  } catch (err) {
    console.error('push disable failed', err);
  }
}
