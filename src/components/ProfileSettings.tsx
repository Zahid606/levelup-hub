import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Settings } from 'lucide-react';

const COUNTRIES = ['Pakistan', 'India', 'Bangladesh', 'Saudi Arabia', 'UAE', 'UK', 'USA', 'Canada', 'Australia', 'Malaysia', 'Turkey', 'Egypt', 'Indonesia', 'South Africa', 'Other'];

export function ProfileSettings() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [city, setCity] = useState('');
  const [country, setCountry] = useState('');
  const [loading, setLoading] = useState(false);

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
          <Input placeholder="City" value={city} onChange={e => setCity(e.target.value)} />
          <Select value={country} onValueChange={setCountry}>
            <SelectTrigger><SelectValue placeholder="Select Country" /></SelectTrigger>
            <SelectContent>
              {COUNTRIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button onClick={handleSave} disabled={loading} className="w-full gradient-primary text-primary-foreground">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
