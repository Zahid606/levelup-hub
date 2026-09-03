import { useEffect, useState } from 'react';
import { Bell, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { enablePush, getPushState } from '@/lib/push';

const DISMISS_KEY = 'push-prompt-dismissed';

/**
 * Keeps this device registered for background Web Push and, when permission has
 * never been asked, shows a small prompt so the student can opt in with a tap.
 */
export function PushGate() {
  const { user } = useAuth();
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void getPushState(user.id).then((state) => {
      if (!active) return;
      // Repair an allowed-but-missing registration for existing students.
      if (state === 'unregistered') { void enablePush(user.id); return; }
      if (state !== 'default' || localStorage.getItem(DISMISS_KEY) === '1') return;
      const timer = window.setTimeout(() => setShow(true), 1500);
      return () => window.clearTimeout(timer);
    });
    return () => { active = false; };
  }, [user]);

  if (!show || !user) return null;

  const inIframe = typeof window !== 'undefined' && window.top !== window.self;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[min(94vw,26rem)]">
      <div className="glass-card rounded-xl border border-border/60 shadow-lg p-3 flex items-start gap-3">
        <Bell className="h-5 w-5 text-primary shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Get new lesson alerts</p>
          <p className="text-xs text-muted-foreground">
            {msg ?? (inIframe
              ? 'Open the site in its own browser tab to turn on notifications.'
              : 'Be notified even when the app is closed or your screen is off.')}
          </p>
          {!msg && (
            <div className="flex gap-2 mt-2">
              <Button
                size="sm"
                className="h-7 text-xs gradient-primary text-primary-foreground"
                onClick={async () => {
                  const status = await enablePush(user.id);
                  setMsg(
                    status === 'subscribed' ? 'Notifications are on for this device.'
                    : status === 'open-in-new-tab' ? 'Open the site in its own tab, then tap Enable.'
                    : status === 'denied' ? 'Allow notifications in your browser settings to receive alerts.'
                    : 'This device does not support push notifications.',
                  );
                  if (status === 'subscribed') setTimeout(() => setShow(false), 2500);
                }}
              >
                Enable
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 text-xs"
                onClick={() => { localStorage.setItem(DISMISS_KEY, '1'); setShow(false); }}
              >
                Don’t Allow
              </Button>
            </div>
          )}
        </div>
        <button aria-label="Close" className="text-muted-foreground shrink-0" onClick={() => setShow(false)}>
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export default PushGate;
