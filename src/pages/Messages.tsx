import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { TopBar } from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Send, Trash2, ArrowLeft } from 'lucide-react';

type Contact = { user_id: string; full_name: string | null; role: string };
type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
};

/** Groups messages into human friendly buckets: Today, Yesterday, 5 days ago, older. */
function dayLabel(iso: string) {
  const d = new Date(iso);
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime();
  const diffDays = Math.round((startOf(new Date()) - startOf(d)) / 86400000);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) {
    const w = Math.floor(diffDays / 7);
    return w === 1 ? 'Last week' : `${w} weeks ago`;
  }
  return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function Messages() {
  const { user, isAdmin, isManager } = useAuth();
  const canDelete = isAdmin || isManager;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [active, setActive] = useState<string>('');
  const [search, setSearch] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    if (!user) return;
    const [contactsRes, messagesRes] = await Promise.all([
      supabase.rpc('get_message_contacts' as any),
      supabase
        .from('messages' as any)
        .select('*')
        .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
        .order('created_at', { ascending: true }),
    ]);
    if (contactsRes.error) toast.error(`Could not load contacts: ${contactsRes.error.message}`);
    setContacts(((contactsRes.data as any[]) || []) as Contact[]);
    setMessages(((messagesRes.data as any[]) || []) as Message[]);
  }, [user]);

  useEffect(() => { void load(); }, [load]);

  // Live updates so conversations feel instant on mobile and desktop.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel('messages-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, () => { void load(); })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, load]);

  const nameOf = useCallback(
    (id: string) => contacts.find(c => c.user_id === id)?.full_name || 'User',
    [contacts],
  );

  const threadFor = useCallback(
    (id: string) => messages.filter(m => m.sender_id === id || m.recipient_id === id),
    [messages],
  );

  const unreadFrom = useCallback(
    (id: string) => messages.filter(m => m.sender_id === id && m.recipient_id === user?.id && !m.read_at).length,
    [messages, user],
  );

  const sortedContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter(c => !q || (c.full_name || '').toLowerCase().includes(q) || c.role.toLowerCase().includes(q))
      .sort((a, b) => {
        const la = threadFor(a.user_id).at(-1)?.created_at || '';
        const lb = threadFor(b.user_id).at(-1)?.created_at || '';
        return lb.localeCompare(la);
      });
  }, [contacts, search, threadFor]);

  const thread = active ? threadFor(active) : [];

  const grouped = useMemo(() => {
    const groups: { label: string; items: Message[] }[] = [];
    for (const m of thread) {
      const label = dayLabel(m.created_at);
      const last = groups.at(-1);
      if (last && last.label === label) last.items.push(m);
      else groups.push({ label, items: [m] });
    }
    return groups;
  }, [thread]);

  // Mark the open conversation as read.
  useEffect(() => {
    if (!active || !user) return;
    const unread = thread.filter(m => m.recipient_id === user.id && !m.read_at).map(m => m.id);
    if (!unread.length) return;
    void supabase.from('messages' as any).update({ read_at: new Date().toISOString() } as any).in('id', unread)
      .then(() => setMessages(prev => prev.map(m => (unread.includes(m.id) ? { ...m, read_at: new Date().toISOString() } : m))));
  }, [active, thread, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [active, thread.length]);

  async function send() {
    if (!active || !body.trim() || !user) return;
    setSending(true);
    const { data, error } = await supabase
      .from('messages' as any)
      .insert({ sender_id: user.id, recipient_id: active, body: body.trim() } as any)
      .select()
      .single();
    setSending(false);
    if (error) { toast.error(error.message); return; }
    setBody('');
    if (data) setMessages(prev => [...prev, data as unknown as Message]);
  }

  async function remove(id: string) {
    const { error } = await supabase.from('messages' as any).delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="container py-6 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-heading font-bold mb-4 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-primary" /> Messages
        </h1>

        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          {/* Conversation list — hidden on mobile while a chat is open */}
          <Card className={`glass-card ${active ? 'hidden md:block' : ''}`}>
            <CardContent className="p-3 space-y-2">
              <Input placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} />
              <div className="max-h-[60vh] overflow-y-auto divide-y divide-border/60">
                {sortedContacts.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">No one available to message yet.</p>
                )}
                {sortedContacts.map(c => {
                  const last = threadFor(c.user_id).at(-1);
                  const unread = unreadFrom(c.user_id);
                  return (
                    <button
                      key={c.user_id}
                      onClick={() => setActive(c.user_id)}
                      className={`w-full text-left p-2.5 rounded-md transition-colors ${active === c.user_id ? 'bg-primary/10' : 'hover:bg-muted/50'}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-medium truncate">{c.full_name || 'User'}</span>
                        {unread > 0 && <Badge className="h-5 px-1.5 text-[10px]">{unread}</Badge>}
                      </div>
                      <p className="text-[11px] text-muted-foreground truncate">
                        {c.role}{last ? ` · ${last.body}` : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Thread */}
          <Card className={`glass-card ${active ? '' : 'hidden md:block'}`}>
            <CardContent className="p-3 flex flex-col h-[70vh]">
              {!active ? (
                <p className="text-sm text-muted-foreground m-auto">Select a conversation to start messaging.</p>
              ) : (
                <>
                  <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                    <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setActive('')}>
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <p className="text-sm font-semibold">{nameOf(active)}</p>
                  </div>

                  <div className="flex-1 overflow-y-auto py-3 space-y-4">
                    {grouped.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center">No messages yet — say hello.</p>
                    )}
                    {grouped.map(group => (
                      <div key={group.label} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="h-px flex-1 bg-border/60" />
                          <span className="text-[11px] uppercase tracking-wide text-muted-foreground">{group.label}</span>
                          <div className="h-px flex-1 bg-border/60" />
                        </div>
                        {group.items.map(m => {
                          const mine = m.sender_id === user?.id;
                          return (
                            <div key={m.id} className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`group max-w-[80%] rounded-2xl px-3 py-2 ${mine ? 'bg-primary/15' : 'bg-muted/60'}`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                                <div className="flex items-center gap-2 justify-end">
                                  <span className="text-[10px] text-muted-foreground">
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {canDelete && (
                                    <button
                                      onClick={() => remove(m.id)}
                                      className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-opacity"
                                      aria-label="Delete message"
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ))}
                    <div ref={bottomRef} />
                  </div>

                  <div className="flex items-end gap-2 pt-2 border-t border-border/60">
                    <Textarea
                      rows={2}
                      placeholder="Write a message…"
                      value={body}
                      onChange={e => setBody(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                    />
                    <Button onClick={send} disabled={sending || !body.trim()} className="gradient-primary text-primary-foreground">
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
