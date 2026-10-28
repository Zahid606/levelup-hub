import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getMessageContacts } from "@/lib/messageContacts.functions";
import { sendMessagePush } from "@/lib/messagePush.functions";
import { TopBar } from "@/components/TopBar";
import { Card } from "@/components/ui/card";
import {
  ConversationList,
  type ListTab,
} from "@/components/messages/ConversationList";
import { ChatThread } from "@/components/messages/ChatThread";
import {
  MAX_MESSAGE_LENGTH,
  buildConversations,
  buildDirectory,
  isStaffRole,
  isUnread,
  newMessageId,
  reconcile,
  recipientFor,
  removeMessage,
  upsertMessage,
  type Contact,
  type Message,
} from "@/lib/messaging";

/** Contacts come from a database function first; the server function is only a fallback. */
async function fetchContacts(): Promise<Contact[]> {
  const { data, error } = await supabase.rpc("get_message_contacts");
  if (!error) return (data || []) as Contact[];
  try {
    return (await getMessageContacts()) as Contact[];
  } catch (e: unknown) {
    throw new Error(
      `${error.message} / ${e instanceof Error ? e.message : "unknown error"}`,
    );
  }
}

export default function Messages() {
  const { user, loading: authLoading, isAdmin, isManager } = useAuth();
  const isStaff = isAdmin || isManager;

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [activeKey, setActiveKey] = useState("");
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<ListTab>("inbox");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [live, setLive] = useState(false);
  const [visible, setVisible] = useState(true);

  const contactsRef = useRef<Contact[]>([]);
  const messagesRef = useRef<Message[]>([]);
  messagesRef.current = messages;
  const markedRef = useRef<Set<string>>(new Set());

  // Wait for the role check: an admin must never be treated as a student, even for a moment.
  const viewer = useMemo(
    () => (user && !authLoading ? { id: user.id, isStaff } : null),
    [user, authLoading, isStaff],
  );
  const dir = useMemo(
    () => buildDirectory(contacts, viewer ?? { id: "", isStaff: false }),
    [contacts, viewer],
  );
  const conversations = useMemo(
    () => (viewer ? buildConversations(contacts, messages, viewer) : []),
    [contacts, messages, viewer],
  );
  const active = conversations.find((c) => c.key === activeKey);

  // ---- loading -----------------------------------------------------------------

  const loadContacts = useCallback(async () => {
    try {
      const list = await fetchContacts();
      contactsRef.current = list;
      setContacts(list);
      setError("");
      return true;
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "unknown error");
      return false;
    }
  }, []);

  /** Fetches the messages this person is allowed to see and merges them in. */
  const refresh = useCallback(async () => {
    if (!user) return;
    const staffIds = contactsRef.current
      .filter((c) => isStaffRole(c.role))
      .map((c) => c.user_id);
    const ids = isStaff ? [user.id, ...staffIds] : [user.id];
    const list = ids.join(",");
    const filter = isStaff
      ? `sender_id.in.(${list}),recipient_id.in.(${list})`
      : `sender_id.eq.${user.id},recipient_id.eq.${user.id}`;
    const { data, error: err } = await supabase
      .from("messages")
      .select("*")
      .or(filter)
      .order("created_at", { ascending: false })
      .limit(isStaff ? 1000 : 500);
    if (err) {
      toast.error(`Could not load messages: ${err.message}`);
      return;
    }
    setMessages((prev) =>
      reconcile(prev, ((data || []) as Message[]).reverse()),
    );
  }, [user, isStaff]);

  useEffect(() => {
    if (!user || authLoading) return;
    let cancelled = false;
    setLoading(true);
    void (async () => {
      const ok = await loadContacts();
      if (ok) await refresh();
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, loadContacts, refresh]);

  const retryAll = useCallback(async () => {
    setLoading(true);
    if (await loadContacts()) await refresh();
    setLoading(false);
  }, [loadContacts, refresh]);

  // ---- live updates --------------------------------------------------------------

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`messages-page:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        (payload) => {
          if (payload.eventType === "DELETE") {
            const id = (payload.old as { id?: string }).id;
            if (id) setMessages((prev) => removeMessage(prev, id));
            return;
          }
          const row = payload.new as Message;
          setMessages((prev) => upsertMessage(prev, row));
          // A message from someone we have not met yet (new student, new admin): refresh the directory.
          const other =
            row.sender_id === user.id ? row.recipient_id : row.sender_id;
          if (!contactsRef.current.some((c) => c.user_id === other))
            void loadContacts();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          setLive(true);
          void refresh(); // catch up on anything missed while disconnected
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setLive(false);
        }
      });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [user, refresh, loadContacts]);

  // Safety net: poll while the tab is open (slowly when live updates work, quickly when they do not).
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    const id = setInterval(tick, live ? 60_000 : 10_000);
    document.addEventListener("visibilitychange", tick);
    window.addEventListener("focus", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
      window.removeEventListener("focus", tick);
    };
  }, [live, refresh]);

  useEffect(() => {
    const onVis = () => setVisible(document.visibilityState === "visible");
    onVis();
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  // ---- choosing a conversation -----------------------------------------------------

  useEffect(() => {
    if (activeKey || !viewer || viewer.isStaff || conversations.length === 0)
      return;
    const wide =
      typeof window !== "undefined" &&
      window.matchMedia("(min-width: 768px)").matches;
    if (conversations.length === 1 || wide) setActiveKey(conversations[0]!.key);
  }, [activeKey, viewer, conversations]);

  // A selection that no longer exists (role changed, contact removed) falls back to the list.
  useEffect(() => {
    if (
      !loading &&
      activeKey &&
      !conversations.some((c) => c.key === activeKey)
    )
      setActiveKey("");
  }, [loading, activeKey, conversations]);

  // ---- read receipts ---------------------------------------------------------------

  useEffect(() => {
    if (!viewer || !user || !active || !visible) return;
    const ids = active.items
      .filter((m) => isUnread(m, viewer, dir) && !markedRef.current.has(m.id))
      .map((m) => m.id);
    if (ids.length === 0) return;
    ids.forEach((id) => markedRef.current.add(id));
    const now = new Date().toISOString();
    setMessages((prev) =>
      prev.map((m) => (ids.includes(m.id) ? { ...m, read_at: now } : m)),
    );
    void (async () => {
      const { error: err } = await supabase
        .from("messages")
        .update({ read_at: now })
        .in("id", ids);
      if (err) {
        ids.forEach((id) => markedRef.current.delete(id)); // try again on the next refresh
        return;
      }
      // Clear the matching bell notifications so the badges agree.
      await supabase
        .from("notifications")
        .update({ read_at: now })
        .eq("user_id", user.id)
        .eq("type", "message")
        .is("read_at", null)
        .in(
          "dedupe_key",
          ids.map((id) => `message:${id}`),
        );
      window.dispatchEvent(new Event("messages:read"));
    })();
  }, [active, viewer, user, dir, visible]);

  // ---- sending ---------------------------------------------------------------------

  const deliver = useCallback(
    async (msg: Message) => {
      const { data, error: err } = await supabase
        .from("messages")
        .insert({
          id: msg.id,
          sender_id: msg.sender_id,
          recipient_id: msg.recipient_id,
          body: msg.body,
        })
        .select()
        .single();
      if (!err && data) {
        setMessages((prev) => upsertMessage(prev, data as Message));
        // Best effort: a phone notification for people who have the app closed.
        void sendMessagePush({ data: { id: msg.id } }).catch(() => undefined);
        return;
      }
      if (err?.code === "23505") {
        // An earlier attempt already saved this exact message (the reply was lost). Nothing to resend.
        setMessages((prev) =>
          prev.map((m) => (m.id === msg.id ? { ...m, status: undefined } : m)),
        );
        void refresh();
        return;
      }
      // The reply was lost but a live update may already have confirmed the message: only flag it if it is still unconfirmed.
      if (!messagesRef.current.some((m) => m.id === msg.id && m.status)) return;
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msg.id && m.status ? { ...m, status: "failed" } : m,
        ),
      );
      toast.error(
        err?.message?.toLowerCase().includes("fetch")
          ? "No connection. Your message was kept — tap retry."
          : `Message not sent: ${err?.message ?? "unknown error"}`,
      );
    },
    [refresh],
  );

  const send = useCallback(() => {
    if (!viewer || !active) return;
    const text = (drafts[active.key] || "").trim();
    if (!text || text.length > MAX_MESSAGE_LENGTH) return;
    const to = recipientFor(active, contacts, viewer.id);
    if (!to) {
      toast.error("No one is available to receive this message yet.");
      return;
    }
    const msg: Message = {
      id: newMessageId(),
      sender_id: viewer.id,
      recipient_id: to,
      body: text,
      read_at: null,
      created_at: new Date().toISOString(),
      status: "sending",
    };
    setMessages((prev) => upsertMessage(prev, msg));
    setDrafts((d) => ({ ...d, [active.key]: "" }));
    void deliver(msg);
  }, [viewer, active, drafts, contacts, deliver]);

  const retry = useCallback(
    (m: Message) => {
      setMessages((prev) =>
        prev.map((x) => (x.id === m.id ? { ...x, status: "sending" } : x)),
      );
      void deliver({ ...m, status: "sending" });
    },
    [deliver],
  );

  const remove = useCallback(async (m: Message) => {
    const { data, error: err } = await supabase
      .from("messages")
      .delete()
      .eq("id", m.id)
      .select("id");
    if (err || !data || data.length === 0) {
      toast.error(
        err?.message ?? "You do not have permission to delete this message.",
      );
      return;
    }
    setMessages((prev) => removeMessage(prev, m.id));
  }, []);

  const me = viewer ?? { id: "", isStaff: false };

  const canSend =
    !!viewer && !!active && !!recipientFor(active, contacts, viewer.id);
  const paneHeight =
    "h-[calc(100dvh-9.5rem)] min-h-[440px] lg:h-[calc(100dvh-9rem)]";

  return (
    <div className="min-h-screen bg-background">
      <TopBar />
      <main className="container max-w-6xl py-3 md:py-6">
        <Card className="overflow-hidden md:grid md:grid-cols-[340px_1fr]">
          <aside
            className={`${paneHeight} border-border/60 md:border-r ${activeKey ? "hidden md:block" : "block"}`}
          >
            <ConversationList
              conversations={conversations}
              activeKey={activeKey}
              onSelect={setActiveKey}
              viewer={me}
              dir={dir}
              search={search}
              onSearch={setSearch}
              showTabs={me.isStaff}
              tab={tab}
              onTab={setTab}
              loading={loading || !viewer}
              error={error}
              onRetry={() => void retryAll()}
              live={live}
            />
          </aside>

          <section
            className={`${paneHeight} ${activeKey ? "block" : "hidden md:block"}`}
          >
            <ChatThread
              conv={active}
              viewer={me}
              dir={dir}
              draft={active ? drafts[active.key] || "" : ""}
              onDraft={(value) =>
                active && setDrafts((d) => ({ ...d, [active.key]: value }))
              }
              onSend={send}
              onRetry={retry}
              onDelete={me.isStaff ? (m) => void remove(m) : undefined}
              onBack={() => setActiveKey("")}
              canSend={canSend}
            />
          </section>
        </Card>
      </main>
    </div>
  );
}
