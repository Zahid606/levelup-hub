import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Bell, BellOff, CircleCheck, ExternalLink, MapPin, MapPinOff } from 'lucide-react';
import { disablePush, enablePush, getPushState, type PushPermissionState } from '@/lib/push';
import { getGeoState, requestGeoPermission, watchGeoState, type GeoPermissionState } from '@/lib/geo';

const COUNTRIES = ['Pakistan', 'India', 'Bangladesh', 'Saudi Arabia', 'UAE', 'UK', 'USA', 'Canada', 'Australia', 'Malaysia', 'Turkey', 'Egypt', 'Indonesia', 'South Africa', 'Other'];

const SAUDI_CITIES = [
  'Riyadh', 'Jeddah', 'Makkah', 'Madinah', 'Dammam', 'Dhahran', 'Khobar', 'Tabuk',
  'Buraidah', 'Khamis Mushait', 'Abha', 'Taif', 'Hail', 'Najran', 'Jubail', 'Yanbu',
  'Al Ahsa', 'Arar', 'Sakaka', 'Jizan', 'Al Baha', 'Bisha', 'Unaizah', 'Qatif', 'Other'
];

export function ProfileSettings() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);
  const [pushState, setPushState] = useState<PushPermissionState>('unsupported');
  const [pushBusy, setPushBusy] = useState(false);
  const [geoState, setGeoState] = useState<GeoPermissionState>('default');
  const [geoBusy, setGeoBusy] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    let unwatch: (() => void) | undefined;
    void getGeoState().then((s) => { if (!cancelled) setGeoState(s); });
    void watchGeoState((s) => { if (!cancelled) setGeoState(s); }).then((fn) => {
      if (cancelled) fn(); else unwatch = fn;
    });
    return () => { cancelled = true; unwatch?.(); };
  }, [open]);

  const requestLocation = async () => {
    setGeoBusy(true);
    const result = await requestGeoPermission();
    setGeoBusy(false);
    if (result.status === 'granted') {
      setGeoState('granted');
      setCoords(result.coords);
      toast.success('Location allowed on this device');
      return;
    }
    setGeoState(result.status === 'unsupported' ? 'unsupported' : result.status === 'denied' ? 'denied' : await getGeoState());
    toast.error(
      result.status === 'denied' ? 'Location blocked. Allow it in your browser or device settings.'
      : result.status === 'timeout' ? 'Location request timed out. Please try again.'
      : result.status === 'unsupported' ? 'This browser or device does not support location'
      : 'Could not get your location. Please try again.',
    );
  };

  const geoDescription = geoState === 'granted'
    ? coords
      ? `Allowed — detected at ${coords.latitude.toFixed(3)}, ${coords.longitude.toFixed(3)}.`
      : 'Allowed — this device can share your location.'
    : geoState === 'denied'
      ? 'Blocked. Open this site’s permissions (lock or site-info icon beside the address bar, or Settings → Site settings on mobile), set Location to Allow, then reload this page.'
      : geoState === 'unsupported'
        ? 'Location is unavailable in this browser or device.'
        : 'Not set. Choose Allow Location to show the browser’s location prompt.';

  useEffect(() => {
    if (!open || !user) return;
    const refresh = () => { void getPushState(user.id).then(setPushState); };
    refresh();
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [open, user]);

  const togglePush = async (next: boolean) => {
    if (!user) return;
    setPushBusy(true);
    if (next) {
      const status = await enablePush(user.id);
      setPushBusy(false);
      if (status === 'subscribed') { setPushState('enabled'); toast.success('Push notifications enabled on this device'); return; }
      toast.error(
        status === 'open-in-new-tab' ? 'Open the site in its own browser tab, then try again'
        : status === 'denied' ? 'Allow notifications in your browser settings'
        : status === 'unsupported' ? 'This browser or device does not support push notifications'
        : 'Could not register this device. Please try again.',
      );
      setPushState(status === 'denied' ? 'denied' : status === 'unsupported' ? 'unsupported' : 'unregistered');
      return;
    }
    const disabled = await disablePush();
    setPushBusy(false);
    if (!disabled) {
      setPushState(await getPushState(user.id));
      toast.error('Could not turn off notifications on this device. Please try again.');
      return;
    }
    setPushState(typeof Notification !== 'undefined' && Notification.permission === 'denied' ? 'denied' : 'unregistered');
    toast.success('Push notifications turned off on this device');
  };

  const pushOn = pushState === 'enabled';
  const pushDescription = pushState === 'enabled'
    ? 'On — this device is registered for lesson alerts.'
    : pushState === 'default'
      ? 'Choose Allow Notifications to receive lesson alerts on this device.'
      : pushState === 'denied'
        ? 'Blocked by your browser. Open this site’s permissions, set Notifications to Allow, then return here.'
        : pushState === 'unregistered'
          ? 'Permission is allowed, but this device is not registered. Turn notifications on to repair it.'
          : 'Push notifications are unavailable in this browser. On iPhone or iPad, add the site to your Home Screen and open it there.';


  useEffect(() => {
    if (!user || !open) return;
    supabase.from('profiles').select('city, country').eq('user_id', user.id).single().then(({ data }) => {
      if (data) {
        setCity((data as any).city || '');
        setCountry((data as any).country || '');
      }
    });
  }, [user, open]);

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    const { error } = await supabase.from('profiles').update({ city, country } as any).eq('user_id', user.id);
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success('Profile updated!');
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" title="Profile Settings">
          <Settings className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Student Settings</DialogTitle>
          <DialogDescription>Manage your profile and this device’s notifications.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <Select value={country} onValueChange={v => { setCountry(v); if (v !== 'Saudi Arabia') setCity(''); }}>
            <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          {country === 'Saudi Arabia' ? (
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger><SelectValue placeholder="Select City" /></SelectTrigger>
              <SelectContent>
                {SAUDI_CITIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          ) : (
            <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
          )}
          <Button onClick={handleSave} disabled={loading} className="w-full gradient-primary text-primary-foreground">
            Save Changes
          </Button>

          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-center justify-between gap-3">
            <div className="flex items-start gap-2 min-w-0">
              {pushOn
                ? <CircleCheck className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                : <BellOff className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">Push Notifications</p>
                <p className="text-xs text-muted-foreground">{pushDescription}</p>
              </div>
            </div>
            {pushState !== 'default' && (
              <Switch
                checked={pushOn}
                disabled={pushBusy || pushState === 'unsupported' || pushState === 'denied'}
                onCheckedChange={(v) => { void togglePush(v); }}
                aria-label="Push notifications"
              />
            )}
            </div>
            {pushState === 'default' && (
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button type="button" size="sm" disabled={pushBusy} onClick={() => { void togglePush(true); }}>
                  <Bell className="h-4 w-4" /> Allow Notifications
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={pushBusy} onClick={() => toast.info('Notifications remain off. You can allow them here at any time.')}>
                  Don’t Allow
                </Button>
              </div>
            )}
            {pushState === 'denied' && (
              <Button type="button" size="sm" variant="outline" onClick={() => toast.info('Use the lock or site-info icon beside the address bar, open Site settings, and change Notifications to Allow.')}>
                <ExternalLink className="h-4 w-4" /> How to enable
              </Button>
            )}
          </div>

          <div className="space-y-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-start gap-2 min-w-0">
              {geoState === 'granted'
                ? <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                : <MapPinOff className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />}
              <div className="min-w-0">
                <p className="text-sm font-medium">
                  Location: {geoState === 'granted' ? 'ON (Allowed)' : geoState === 'denied' ? 'Blocked' : geoState === 'unsupported' ? 'Unavailable' : 'Not set'}
                </p>
                <p className="text-xs text-muted-foreground">{geoDescription}</p>
              </div>
            </div>
            {geoState !== 'unsupported' && geoState !== 'denied' && (
              <Button type="button" size="sm" disabled={geoBusy} onClick={() => { void requestLocation(); }}>
                <MapPin className="h-4 w-4" /> {geoState === 'granted' ? 'Update my location' : 'Allow Location'}
              </Button>
            )}
            {geoState === 'denied' && (
              <Button type="button" size="sm" variant="outline" onClick={() => toast.info('Open the lock or site-info icon beside the address bar (or Site settings on mobile), set Location to Allow, then reload this page.')}>
                <ExternalLink className="h-4 w-4" /> How to enable
              </Button>
            )}
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
