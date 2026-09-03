export type GeoPermissionState = 'unsupported' | 'default' | 'granted' | 'denied';

export function isGeoSupported() {
  return typeof navigator !== 'undefined' && 'geolocation' in navigator;
}

/** Reads the real browser permission state (never a stored value). */
export async function getGeoState(): Promise<GeoPermissionState> {
  if (!isGeoSupported()) return 'unsupported';
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      if (status.state === 'granted') return 'granted';
      if (status.state === 'denied') return 'denied';
      return 'default';
    }
  } catch {
    /* Permissions API unavailable (older Safari) — fall through */
  }
  return 'default';
}

/** Subscribes to live permission changes where the browser supports it. */
export async function watchGeoState(cb: (state: GeoPermissionState) => void): Promise<() => void> {
  try {
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      const status = await navigator.permissions.query({ name: 'geolocation' as PermissionName });
      const handler = () => cb(status.state === 'granted' ? 'granted' : status.state === 'denied' ? 'denied' : 'default');
      status.addEventListener('change', handler);
      return () => status.removeEventListener('change', handler);
    }
  } catch {
    /* ignore */
  }
  return () => {};
}

export type GeoRequestResult =
  | { status: 'granted'; coords: { latitude: number; longitude: number } }
  | { status: 'denied' | 'unavailable' | 'timeout' | 'unsupported' };

/** Triggers the real browser/device location prompt. */
export function requestGeoPermission(): Promise<GeoRequestResult> {
  if (!isGeoSupported()) return Promise.resolve({ status: 'unsupported' });
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ status: 'granted', coords: { latitude: pos.coords.latitude, longitude: pos.coords.longitude } }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) return resolve({ status: 'denied' });
        if (err.code === err.TIMEOUT) return resolve({ status: 'timeout' });
        resolve({ status: 'unavailable' });
      },
      { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 },
    );
  });
}
