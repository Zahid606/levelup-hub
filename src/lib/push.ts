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

    const registration = await navigator.serviceWorker.register('/push-sw.js');
    await navigator.serviceWorker.ready;

    const existing = await registration.pushManager.getSubscription();
    const subscription =
      existing ??
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      }));

    const p256dh = bufferToBase64Url(subscription.getKey('p256dh'));
    const auth = bufferToBase64Url(subscription.getKey('auth'));
    if (!p256dh || !auth) return 'error';

    await supabase.from('push_subscriptions').upsert(
      {
        user_id: userId,
        endpoint: subscription.endpoint,
        p256dh,
        auth,
        user_agent: navigator.userAgent.slice(0, 300),
      } as never,
      { onConflict: 'endpoint' },
    );

    return 'subscribed';
  } catch (err) {
    console.error('push registration failed', err);
    return 'error';
  }
}
