import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { getMessageContacts } from '@/lib/messageContacts.functions';

import { TopBar } from '@/components/TopBar';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { MessageSquare, Send, Trash2, ArrowLeft, Search, Check, CheckCheck } from 'lucide-react';

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

function initials(name: string | null) {
  return (name || 'U').trim().split(/\s+/).slice(0, 2).map(w => w[0]?.toUpperCase()).join('') || 'U';
}

/** Short time for the list: HH:MM today, otherwise the day label. */
function listTime(iso: string) {
  const d = new Date(iso);
  const label = dayLabel(iso);
  return label === 'Today' ? d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : label;
}

/** Contacts come from a database function first; the server function is the fallback. */
async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase.rpc('get_message_contacts');
  if (!error) return (data || []) as Contact[];
  try {
    return (await getMessageContacts()) as Contact[];
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : 'unknown error';
    throw new Error(`${error.message} / ${detail}`);
  }
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
  const [loading, setLoading] = useState(true);
  const [contactsError, setContactsError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef('');
  activeRef.current = active;

  const mine = useCallback(
    (m: Pick<Message, 'sender_id' | 'recipient_id'>) => !!user && (m.sender_id === user.id || m.recipient_id === user.id),
    [user],
  );

  const loadContacts = useCallback(async () => {
    try {
      setContacts(await fetchContacts());
      setContactsError('');
    } catch (e: unknown) {
      setContactsError(e instanceof Error ? e.message : 'unknown error');
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!user) return;
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
      .order('created_at', { ascending: false })
      .limit(500);
    if (error) { toast.error(`Could not load messages: ${error.message}`); return; }
    setMessages((data || []).slice().reverse() as Message[]);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    void Promise.all([loadContacts(), loadMessages()]).finally(() => setLoading(false));
  }, [user, loadContacts, loadMessages]);

  // Live updates applied in place, so nothing is re-fetched when a message arrives.
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-live:${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
        if (payload.eventType === 'DELETE') {
          const id = (payload.old as { id?: string }).id;
          if (id) setMessages(prev => prev.filter(m => m.id !== id));
          return;
        }
        const row = payload.new as Message;
        if (!mine(row)) return;
        setMessages(prev => {
          const i = prev.findIndex(m => m.id === row.id);
          if (i === -1) return [...prev, row];
          const next = prev.slice();
          next[i] = row;
          return next;
        });
        // A message from someone we have not loaded yet: refresh the contact list once.
        if (payload.eventType === 'INSERT') void loadContacts();
      })
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, mine, loadContacts]);

  const nameOf = useCallback(
    (id: string) => contacts.find(c => c.user_id === id)?.full_name || 'User',
    [contacts],
  );

  // One pass over the messages gives every conversation's thread, last message and unread count.
  const threads = useMemo(() => {
    const map = new Map<string, { items: Message[]; unread: number }>();
    for (const m of messages) {
      const other = m.sender_id === user?.id ? m.recipient_id : m.sender_id;
      const t = map.get(other) || { items: [], unread: 0 };
      t.items.push(m);
      if (m.recipient_id === user?.id && !m.read_at) t.unread += 1;
      map.set(other, t);
    }
    return map;
  }, [messages, user]);

  const sortedContacts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return contacts
      .filter(c => !q || (c.full_name || '').toLowerCase().includes(q) || c.role.toLowerCase().includes(q))
      .sort((a, b) => {
        const la = threads.get(a.user_id)?.items.at(-1)?.created_at || '';
        const lb = threads.get(b.user_id)?.items.at(-1)?.created_at || '';
        return lb.localeCompare(la) || (a.full_name || '').localeCompare(b.full_name || '');
      });
  }, [contacts, search, threads]);

  const thread = active ? threads.get(active)?.items || [] : [];
  const unreadInActive = active ? threads.get(active)?.unread || 0 : 0;

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

  // Mark the open conversation as read, including messages that arrive while it is open.
  useEffect(() => {
    if (!active || !user || unreadInActive === 0) return;
    const ids = thread.filter(m => m.recipient_id === user.id && !m.read_at).map(m => m.id);
    const now = new Date().toISOString();
    setMessages(prev => prev.map(m => (ids.includes(m.id) ? { ...m, read_at: now } : m)));
    void supabase.from('messages').update({ read_at: now }).in('id', ids);
  }, [active, unreadInActive, thread, user]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ block: 'end' }); }, [active, thread.length]);

  async function send() {
    const text = body.trim();
    if (!activeRef.current || !text || !user || sending) return;
    const to = activeRef.current;
    const tempId = `temp-${Date.now()}`;
    const temp: Message = { id: tempId, sender_id: user.id, recipient_id: to, body: text, read_at: null, created_at: new Date().toISOString() };
    // Show it instantly; swap in the saved row (or roll back) when the server answers.
    setMessages(prev => [...prev, temp]);
    setBody('');
    setSending(true);
    const { data, error } = await supabase
      .from('messages')
      .insert({ sender_id: user.id, recipient_id: to, body: text })
      .select()
      .single();
    setSending(false);
    if (error || !data) {
      setMessages(prev => prev.filter(m => m.id !== tempId));
      setBody(text);
      toast.error(error?.message || 'Message could not be sent');
      return;
    }
    setMessages(prev => {
      // The realtime event may already have added the saved row.
      const without = prev.filter(m => m.id !== tempId);
      return without.some(m => m.id === data.id) ? without : [...without, data as Message];
    });
  }

  async function remove(id: string) {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    setMessages(prev => prev.filter(m => m.id !== id));
  }

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="container py-6 max-w-5xl">
        <h1 className="text-2xl md:text-3xl font-heading font-semibold mb-4 flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-accent" /> Messages
        </h1>

        <div className="grid md:grid-cols-[300px_1fr] gap-4">
          {/* Conversation list — hidden on mobile while a chat is open */}
          <Card className={`glass-card ${active ? 'hidden md:block' : ''}`}>
            <CardContent className="p-3 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search people…" value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
              </div>
              <div className="max-h-[62vh] overflow-y-auto space-y-0.5">
                {contactsError && (
                  <div className="p-3 space-y-2">
                    <p className="text-sm text-muted-foreground">Messaging is temporarily unavailable. Please try again in a moment.</p>
                    <Button size="sm" variant="outline" onClick={() => void loadContacts()}>Retry</Button>
                  </div>
                )}
                {loading && !contactsError && [0, 1, 2, 3].map(i => (
                  <div key={i} className="flex items-center gap-3 p-2.5">
                    <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-1/2 rounded bg-muted animate-pulse" />
                      <div className="h-2.5 w-3/4 rounded bg-muted animate-pulse" />
                    </div>
                  </div>
                ))}
                {!loading && !contactsError && sortedContacts.length === 0 && (
                  <p className="p-3 text-sm text-muted-foreground">
                    {search ? 'No matches.' : 'No one available to message yet.'}
                  </p>
                )}
                {sortedContacts.map(c => {
                  const t = threads.get(c.user_id);
                  const last = t?.items.at(-1);
                  const unread = t?.unread || 0;
                  return (
                    <button
                      key={c.user_id}
                      onClick={() => setActive(c.user_id)}
                      className={`w-full text-left flex items-center gap-3 p-2.5 rounded-2xl transition-colors duration-200 ${active === c.user_id ? 'bg-secondary' : 'hover:bg-secondary/60'}`}
                    >
                      <div className="h-10 w-10 shrink-0 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-semibold">
                        {initials(c.full_name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className={`text-sm truncate ${unread ? 'font-semibold' : 'font-medium'}`}>{c.full_name || 'User'}</span>
                          {last && <span className="text-[11px] text-muted-foreground shrink-0">{listTime(last.created_at)}</span>}
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          <p className={`text-xs truncate ${unread ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {last ? `${last.sender_id === user?.id ? 'You: ' : ''}${last.body}` : <span className="capitalize">{c.role}</span>}
                          </p>
                          {unread > 0 && <Badge className="h-5 min-w-5 px-1.5 text-[10px] rounded-full bg-accent text-accent-foreground">{unread}</Badge>}
                        </div>
                      </div>
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
                <div className="m-auto text-center text-muted-foreground space-y-2">
                  <MessageSquare className="h-10 w-10 mx-auto opacity-30" />
                  <p className="text-sm">Select a conversation to start messaging.</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-3 pb-3 border-b border-border/60">
                    <Button variant="ghost" size="sm" className="md:hidden" onClick={() => setActive('')} aria-label="Back">
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="h-9 w-9 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-semibold">
                      {initials(nameOf(active))}
                    </div>
                    <div>
                      <p className="text-sm font-semibold leading-tight">{nameOf(active)}</p>
                      <p className="text-[11px] text-muted-foreground capitalize">{contacts.find(c => c.user_id === active)?.role}</p>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto py-3 space-y-4">
                    {grouped.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center">No messages yet — say hello.</p>
                    )}
                    {grouped.map(group => (
                      <div key={group.label} className="space-y-1.5">
                        <div className="flex justify-center">
                          <span className="text-[11px] text-muted-foreground bg-secondary rounded-full px-3 py-0.5">{group.label}</span>
                        </div>
                        {group.items.map(m => {
                          const isMine = m.sender_id === user?.id;
                          const pending = m.id.startsWith('temp-');
                          return (
                            <div key={m.id} className={`flex ${isMine ? 'justify-end' : 'justify-start'}`}>
                              <div className={`group max-w-[80%] rounded-3xl px-4 py-2 transition-opacity ${pending ? 'opacity-60' : ''} ${isMine ? 'bg-accent text-accent-foreground rounded-br-lg' : 'bg-secondary rounded-bl-lg'}`}>
                                <p className="text-sm whitespace-pre-wrap break-words">{m.body}</p>
                                <div className="flex items-center gap-2 justify-end">
                                  <span className={`text-[10px] ${isMine ? 'text-accent-foreground/70' : 'text-muted-foreground'}`}>
                                    {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                  {isMine && !pending && (
                                    m.read_at
                                      ? <CheckCheck className="h-3 w-3 text-accent-foreground/80" aria-label="Seen" />
                                      : <Check className="h-3 w-3 text-accent-foreground/60" aria-label="Sent" />
                                  )}
                                  {canDelete && !pending && (
                                    <button
                                      onClick={() => remove(m.id)}
                                      className="opacity-0 group-hover:opacity-100 text-current/60 hover:text-destructive transition-opacity"
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

                  <div className="flex items-end gap-2 pt-3 border-t border-border/60">
                    <Textarea
                      rows={1}
                      placeholder="Write a message…"
                      value={body}
                      className="min-h-[44px] max-h-32 resize-none"
                      onChange={e => setBody(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); void send(); } }}
                    />
                    <Button onClick={() => void send()} disabled={!body.trim()} size="icon" className="shrink-0 h-11 w-11" aria-label="Send">
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
