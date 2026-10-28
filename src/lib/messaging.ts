/**
 * Pure messaging logic (no React, no network) so it can be unit tested.
 *
 * Model
 *  - Admins and managers form the "Admin Team". A student/volunteer talks to the
 *    team as ONE conversation, whichever staff member answers.
 *  - Staff see one conversation per student. Any staff member can read and reply,
 *    and a message addressed to any staff member counts as "for the team".
 *  - Volunteers and their assigned students talk one-to-one.
 */

export type Contact = {
  user_id: string;
  full_name: string | null;
  role: string;
  avatar_url?: string | null;
};

export type Message = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  /** Local only: not confirmed by the server yet. */
  status?: "sending" | "failed" | undefined;
  /** Local only: why the last send attempt failed. */
  error?: string | undefined;
};

export const TEAM_KEY = "team";
export const MAX_MESSAGE_LENGTH = 4000;

export const isStaffRole = (role: string | null | undefined) =>
  role === "admin" || role === "manager";

export type Viewer = { id: string; isStaff: boolean };

export type Directory = {
  staffIds: Set<string>;
  byId: Map<string, Contact>;
};

export function buildDirectory(contacts: Contact[], viewer: Viewer): Directory {
  const staffIds = new Set(
    contacts.filter((c) => isStaffRole(c.role)).map((c) => c.user_id),
  );
  if (viewer.isStaff) staffIds.add(viewer.id);
  return { staffIds, byId: new Map(contacts.map((c) => [c.user_id, c])) };
}

/** Which conversation a message belongs to for this viewer (null = not visible in their inbox). */
export function conversationKey(
  m: Message,
  viewer: Viewer,
  dir: Directory,
): string | null {
  const mine = m.sender_id === viewer.id || m.recipient_id === viewer.id;
  const other = m.sender_id === viewer.id ? m.recipient_id : m.sender_id;

  if (viewer.isStaff) {
    const senderStaff = dir.staffIds.has(m.sender_id);
    const recipientStaff = dir.staffIds.has(m.recipient_id);
    // staff <-> student/volunteer: one shared thread per non-staff person
    if (senderStaff !== recipientStaff)
      return senderStaff ? m.recipient_id : m.sender_id;
    // staff <-> staff (only mine) ; chats between two non-staff people are not for the inbox
    return mine ? other : null;
  }

  if (!mine) return null;
  return dir.staffIds.has(other) ? TEAM_KEY : other;
}

/** True when the message was written to this viewer (or, for staff, to the Admin Team). */
export function isIncoming(
  m: Message,
  viewer: Viewer,
  dir: Directory,
): boolean {
  if (m.sender_id === viewer.id) return false;
  if (m.recipient_id === viewer.id) return true;
  return (
    viewer.isStaff &&
    dir.staffIds.has(m.recipient_id) &&
    !dir.staffIds.has(m.sender_id)
  );
}

export const isUnread = (m: Message, viewer: Viewer, dir: Directory) =>
  !m.status && !m.read_at && isIncoming(m, viewer, dir);

export type Conversation = {
  key: string;
  kind: "team" | "person";
  title: string;
  subtitle: string;
  role?: string | undefined;
  avatarUrl?: string | null | undefined;
  items: Message[];
  unread: number;
  last?: Message | undefined;
};

export function roleLabel(role: string | undefined): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "manager":
      return "Manager";
    case "volunteer":
      return "Volunteer";
    case "employee":
      return "Staff";
    default:
      return "Student";
  }
}

export function initials(name: string | null | undefined): string {
  const letters = (name || "U")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => Array.from(w)[0]?.toUpperCase() ?? "");
  return letters.join("") || "U";
}

const byTime = (a: Message, b: Message) =>
  a.created_at < b.created_at
    ? -1
    : a.created_at > b.created_at
      ? 1
      : a.id < b.id
        ? -1
        : 1;

export function buildConversations(
  contacts: Contact[],
  messages: Message[],
  viewer: Viewer,
): Conversation[] {
  const dir = buildDirectory(contacts, viewer);
  const buckets = new Map<string, Message[]>();
  for (const m of messages) {
    const key = conversationKey(m, viewer, dir);
    if (!key) continue;
    const list = buckets.get(key);
    if (list) list.push(m);
    else buckets.set(key, [m]);
  }

  const make = (key: string): Conversation => {
    const items = (buckets.get(key) || []).slice().sort(byTime);
    const unread = items.filter((m) => isUnread(m, viewer, dir)).length;
    if (key === TEAM_KEY) {
      return {
        key,
        kind: "team",
        title: "Admin Team",
        subtitle: "Admins & managers",
        items,
        unread,
        last: items.at(-1),
      };
    }
    const c = dir.byId.get(key);
    return {
      key,
      kind: "person",
      title: c?.full_name || "User",
      subtitle: roleLabel(c?.role),
      role: c?.role,
      avatarUrl: c?.avatar_url ?? null,
      items,
      unread,
      last: items.at(-1),
    };
  };

  const keys = new Set<string>();
  if (!viewer.isStaff && [...dir.staffIds].length > 0) keys.add(TEAM_KEY);
  for (const c of contacts) {
    // students and volunteers reach staff through the team conversation
    if (!viewer.isStaff && dir.staffIds.has(c.user_id)) continue;
    keys.add(c.user_id);
  }
  for (const k of buckets.keys()) keys.add(k);

  return [...keys].map(make).sort((a, b) => {
    if (a.last && b.last) return a.last.created_at < b.last.created_at ? 1 : -1;
    if (a.last) return -1;
    if (b.last) return 1;
    if (a.kind !== b.kind) return a.kind === "team" ? -1 : 1;
    return a.title.localeCompare(b.title);
  });
}

/** Who a message in the Admin Team conversation is addressed to (the team sees it either way). */
export function pickTeamRecipient(
  staff: Contact[],
  thread: Message[],
  viewerId: string,
): string | null {
  const isStaffId = (id: string) => staff.some((s) => s.user_id === id);
  for (let i = thread.length - 1; i >= 0; i--) {
    const m = thread[i]!;
    if (m.sender_id !== viewerId && isStaffId(m.sender_id)) return m.sender_id;
  }
  for (let i = thread.length - 1; i >= 0; i--) {
    const m = thread[i]!;
    if (m.sender_id === viewerId && isStaffId(m.recipient_id))
      return m.recipient_id;
  }
  return (staff.find((s) => s.role === "admin") ?? staff[0])?.user_id ?? null;
}

/** Who a new message in this conversation goes to. */
export function recipientFor(
  conv: Conversation,
  contacts: Contact[],
  viewerId: string,
): string | null {
  if (conv.kind === "person") return conv.key;
  return pickTeamRecipient(
    contacts.filter((c) => isStaffRole(c.role)),
    conv.items,
    viewerId,
  );
}

// ---- day grouping ---------------------------------------------------------------

const startOfDay = (d: Date) =>
  new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();

export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const diff = Math.round((startOfDay(now) - startOfDay(d)) / 86_400_000);
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  if (diff < 7) return d.toLocaleDateString(undefined, { weekday: "long" });
  return d.toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    ...(d.getFullYear() === now.getFullYear() ? {} : { year: "numeric" }),
  });
}

export type DayGroup = { key: string; label: string; items: Message[] };

export function groupByDay(
  messages: Message[],
  now: Date = new Date(),
): DayGroup[] {
  const groups: DayGroup[] = [];
  for (const m of messages) {
    const d = new Date(m.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
    const last = groups.at(-1);
    if (last && last.key === key) last.items.push(m);
    else groups.push({ key, label: dayLabel(m.created_at, now), items: [m] });
  }
  return groups;
}

// ---- keeping the local list in sync ---------------------------------------------

/** Insert or replace by id, keep chronological order. */
export function upsertMessage(list: Message[], row: Message): Message[] {
  const i = list.findIndex((m) => m.id === row.id);
  const next =
    i === -1 ? [...list, row] : list.map((m) => (m.id === row.id ? row : m));
  return next.sort(byTime);
}

export function removeMessage(list: Message[], id: string): Message[] {
  return list.filter((m) => m.id !== id);
}

/** Replace local state with a fresh server copy, keeping messages that are still being sent. */
export function reconcile(local: Message[], server: Message[]): Message[] {
  const ids = new Set(server.map((m) => m.id));
  const pending = local.filter((m) => m.status && !ids.has(m.id));
  return [...server, ...pending].sort(byTime);
}

export function firstName(name: string | null | undefined): string {
  return (name || "User").trim().split(/\s+/)[0] || "User";
}

/** One line shown under the name in the conversation list. */
export function previewOf(
  conv: Conversation,
  viewer: Viewer,
  dir: Directory,
): string {
  const m = conv.last;
  if (!m) return conv.subtitle;
  const text = m.body.replace(/\s+/g, " ").trim();
  if (m.sender_id === viewer.id) return `You: ${text}`;
  const shared =
    conv.kind === "team" || (viewer.isStaff && dir.staffIds.has(m.sender_id));
  return shared
    ? `${firstName(dir.byId.get(m.sender_id)?.full_name)}: ${text}`
    : text;
}

/** Time shown on the right of a conversation row: clock time today, otherwise the day label. */
export function listTime(iso: string, now: Date = new Date()): string {
  const label = dayLabel(iso, now);
  return label === "Today"
    ? new Date(iso).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : label;
}

/**
 * A client-made id lets a retry after a dropped connection hit the same row instead of
 * saving the message twice.
 */
export function newMessageId(): string {
  const c = globalThis.crypto;
  if (c && typeof c.randomUUID === "function") return c.randomUUID();
  const bytes = new Uint8Array(16);
  if (c && typeof c.getRandomValues === "function") c.getRandomValues(bytes);
  else for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
  bytes[6] = (bytes[6]! & 0x0f) | 0x40;
  bytes[8] = (bytes[8]! & 0x3f) | 0x80;
  const h = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}
