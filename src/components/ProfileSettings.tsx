import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Settings, Bell } from 'lucide-react';
import { enablePush, disablePush, isPushEnabled, pushSupported } from '@/lib/push';

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
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    void isPushEnabled().then(setPushOn);
  }, [open]);

  const togglePush = async (next: boolean) => {
    if (!user) return;
    setPushBusy(true);
    if (next) {
      const status = await enablePush(user.id);
      setPushBusy(false);
      if (status === 'subscribed') { setPushOn(true); toast.success('Notifications enabled on this device'); return; }
      toast.error(
        status === 'open-in-new-tab' ? 'Open the site in its own browser tab, then try again'
        : status === 'denied' ? 'Allow notifications in your browser settings'
        : 'This device does not support push notifications',
      );
      setPushOn(false);
      return;
    }
    await disablePush();
    setPushBusy(false);
    setPushOn(false);
    toast.success('Notifications turned off for this device');
  };


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
        <DialogHeader><DialogTitle>Edit Profile</DialogTitle></DialogHeader>
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

          <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 p-3">
            <div className="flex items-start gap-2 min-w-0">
              <Bell className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-medium">Notifications</p>
                <p className="text-xs text-muted-foreground">
                  {pushSupported()
                    ? 'Get new lesson alerts even when the app is closed.'
                    : 'Not supported on this device or browser.'}
                </p>
              </div>
            </div>
            <Switch
              checked={pushOn}
              disabled={pushBusy || !pushSupported()}
              onCheckedChange={(v) => { void togglePush(v); }}
              aria-label="Push notifications"
            />
          </div>

        </div>
      </DialogContent>
    </Dialog>
  );
}
