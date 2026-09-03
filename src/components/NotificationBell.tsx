import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from '@/lib/router-compat';
import { Bell, Check, CheckCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { enablePush, pushSupported } from '@/lib/push';


type Notification = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  lesson_id: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<Notification[]>([]);
  const [pushMsg, setPushMsg] = useState<string | null>(null);

  const seenRef = useRef<Set<string> | null>(null);

  const pushToOS = useCallback((list: Notification[]) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;
    if (Notification.permission !== 'granted') return;
    const unseen = list.filter(n => !n.read_at && !seenRef.current?.has(n.id));
    for (const n of unseen.slice(0, 3)) {
      try {
        const sys = new Notification(n.title, { body: n.message || '', tag: n.id, icon: '/favicon.svg' });
        sys.onclick = () => {
          window.focus();
          navigate(n.link || (n.lesson_id ? `/lesson/${n.lesson_id}` : '/'));
          sys.close();
        };
      } catch { /* ignore unsupported browsers */ }
    }
  }, [navigate]);

  const load = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('notifications')
      .select('id,type,title,message,lesson_id,link,read_at,created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30);
    const list = (data as Notification[]) || [];
    if (seenRef.current === null) {
      seenRef.current = new Set(list.map(n => n.id)); // don't re-announce on first load
    } else {
      pushToOS(list);
      list.forEach(n => seenRef.current?.add(n.id));
    }
    setItems(list);
  }, [user, pushToOS]);

  useEffect(() => { void load(); }, [load]);


  // Live updates without refreshing
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'notifications', filter: `user_id=eq.${user.id}` },
        () => { void load(); },
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, load]);

  // Fallback polling — only while the tab is visible, so background tabs and
  // phones stay idle (push handles closed-app delivery).
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === 'visible') void load();
    }, 120_000);
    const onVisible = () => { if (document.visibilityState === 'visible') void load(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', onVisible); };
  }, [load]);


  const unread = items.filter(n => !n.read_at).length;

  async function markRead(id: string) {
    setItems(prev => prev.map(n => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n)));
    await supabase.from('notifications').update({ read_at: new Date().toISOString() }).eq('id', id);
  }

  async function markAllRead() {
    if (!user) return;
    const now = new Date().toISOString();
    setItems(prev => prev.map(n => (n.read_at ? n : { ...n, read_at: now })));
    await supabase.from('notifications').update({ read_at: now }).eq('user_id', user.id).is('read_at', null);
  }

  async function watchNow(n: Notification) {
    if (!n.read_at) await markRead(n.id);
    setOpen(false);
    navigate(n.link || (n.lesson_id ? `/lesson/${n.lesson_id}` : '/'));
  }

  if (!user) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative text-muted-foreground px-2" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
              {unread > 9 ? '9+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[min(92vw,22rem)] p-0">
        <div className="flex items-center justify-between px-3 py-2 border-b border-border/60">
          <p className="text-sm font-semibold">Notifications</p>
          {unread > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={markAllRead}>
              <CheckCheck className="h-3.5 w-3.5 mr-1" />Mark all as read
            </Button>
          )}
        </div>
        {pushSupported() && typeof Notification !== 'undefined' && Notification.permission !== 'granted' && (
          <div className="px-3 py-2 border-b border-border/60 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">Get new lesson alerts on this device</p>
            <Button
              size="sm"
              className="h-7 text-xs gradient-primary text-primary-foreground shrink-0"
              onClick={async () => {
                const status = await enablePush(user.id);
                setPushMsg(
                  status === 'subscribed' ? 'Notifications enabled!'
                  : status === 'open-in-new-tab' ? 'Open the site in its own tab to enable.'
                  : status === 'denied' ? 'Allow notifications in your browser settings.'
                  : 'Notifications are not supported on this device.',
                );
              }}
            >
              Enable
            </Button>
          </div>
        )}
        {pushMsg && <p className="px-3 py-2 text-xs text-muted-foreground border-b border-border/60">{pushMsg}</p>}

        <ScrollArea className="max-h-[60vh]">
          {items.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">No notifications yet.</p>
          ) : (
            <ul className="divide-y divide-border/60">
              {items.map(n => (
                <li key={n.id} className={`p-3 ${n.read_at ? '' : 'bg-primary/5'}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{n.title}</p>
                      {n.message && <p className="text-xs text-muted-foreground line-clamp-2">{n.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                    {!n.read_at && (
                      <Button variant="ghost" size="sm" className="h-7 w-7 p-0 shrink-0" onClick={() => markRead(n.id)} aria-label="Mark as read">
                        <Check className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                  {(n.lesson_id || n.link) && (
                    <Button size="sm" className="mt-2 h-7 text-xs gradient-primary text-primary-foreground" onClick={() => watchNow(n)}>
                      {n.lesson_id ? 'Watch Now' : 'Open'}
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}
