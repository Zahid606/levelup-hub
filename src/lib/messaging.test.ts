import { describe, expect, it } from "vitest";
import {
  TEAM_KEY,
  buildConversations,
  buildDirectory,
  conversationKey,
  dayLabel,
  groupByDay,
  initials,
  isUnread,
  pickTeamRecipient,
  reconcile,
  recipientFor,
  upsertMessage,
  type Contact,
  type Message,
} from "./messaging";

const ADMIN = "admin";
const MGR = "manager";
const S1 = "student1";
const S2 = "student2";
const VOL = "vol";

const person = (id: string, name: string, role: string): Contact => ({
  user_id: id,
  full_name: name,
  role,
});

let seq = 0;
const msg = (
  from: string,
  to: string,
  body: string,
  minsAgo = 0,
  read = false,
): Message => ({
  id: `m${++seq}`,
  sender_id: from,
  recipient_id: to,
  body,
  read_at: read ? "2026-01-01T00:00:00Z" : null,
  created_at: new Date(
    Date.UTC(2026, 9, 28, 12, 0) - minsAgo * 60_000,
  ).toISOString(),
});

const studentContacts = [
  person(ADMIN, "Ustadh Admin", "admin"),
  person(MGR, "Sister Manager", "manager"),
  person(VOL, "Vee", "volunteer"),
];
const staffContacts = [
  person(MGR, "Sister Manager", "manager"),
  person(S1, "Student One", "student"),
  person(S2, "Student Two", "student"),
  person(VOL, "Vee", "volunteer"),
];

const student = { id: S1, isStaff: false };
const admin = { id: ADMIN, isStaff: true };
const manager = { id: MGR, isStaff: true };

describe("student view", () => {
  it("shows ONE Admin Team conversation no matter which staff member wrote", () => {
    const msgs = [
      msg(S1, ADMIN, "hello", 30),
      msg(MGR, S1, "reply from the manager", 10),
      msg(ADMIN, S1, "and the admin", 5),
    ];
    const convs = buildConversations(studentContacts, msgs, student);
    const team = convs.find((c) => c.key === TEAM_KEY)!;
    expect(team.items).toHaveLength(3);
    expect(team.title).toBe("Admin Team");
    expect(convs.filter((c) => c.kind === "team")).toHaveLength(1);
    expect(convs.map((c) => c.key)).not.toContain(ADMIN);
  });

  it("always offers the team conversation, even before any message", () => {
    const convs = buildConversations(studentContacts, [], student);
    expect(convs[0]!.key).toBe(TEAM_KEY);
    expect(convs[0]!.items).toHaveLength(0);
  });

  it("keeps the assigned volunteer as a separate one-to-one chat", () => {
    const msgs = [msg(VOL, S1, "hi student", 3), msg(S1, ADMIN, "to admin", 8)];
    const convs = buildConversations(studentContacts, msgs, student);
    expect(convs.find((c) => c.key === VOL)!.items).toHaveLength(1);
    expect(convs.find((c) => c.key === TEAM_KEY)!.items).toHaveLength(1);
  });

  it("counts unread only for messages sent to me", () => {
    const msgs = [
      msg(ADMIN, S1, "unread reply", 5),
      msg(MGR, S1, "read reply", 9, true),
      msg(S1, ADMIN, "my own", 20),
    ];
    const team = buildConversations(studentContacts, msgs, student).find(
      (c) => c.key === TEAM_KEY,
    )!;
    expect(team.unread).toBe(1);
  });

  it("never shows other people's conversations", () => {
    const msgs = [msg(S2, ADMIN, "someone elses", 4)];
    const convs = buildConversations(studentContacts, msgs, student);
    expect(convs.every((c) => c.items.length === 0)).toBe(true);
  });
});

describe("staff view (shared inbox)", () => {
  const dirAdmin = buildDirectory(
    staffContacts
      .concat(person(ADMIN, "Ustadh Admin", "admin"))
      .filter((c) => c.user_id !== ADMIN),
    admin,
  );

  it("a student message addressed to ONE admin is visible to the manager too", () => {
    const m = msg(S1, ADMIN, "help please", 2);
    expect(conversationKey(m, admin, dirAdmin)).toBe(S1);
    const dirMgr = buildDirectory(
      [
        person(ADMIN, "Ustadh Admin", "admin"),
        person(S1, "Student One", "student"),
      ],
      manager,
    );
    expect(conversationKey(m, manager, dirMgr)).toBe(S1);
    expect(isUnread(m, manager, dirMgr)).toBe(true);
    expect(isUnread(m, admin, dirAdmin)).toBe(true);
  });

  it("groups the student's messages and every staff reply into one thread", () => {
    const msgs = [
      msg(S1, ADMIN, "q", 20),
      msg(MGR, S1, "answer by manager", 10),
      msg(ADMIN, S1, "follow up", 5),
    ];
    const convs = buildConversations(staffContacts, msgs, admin);
    const t = convs.find((c) => c.key === S1)!;
    expect(t.items).toHaveLength(3);
    expect(t.unread).toBe(1); // only the student's message is "for the team"
  });

  it("does not show private volunteer <-> student chats in the inbox", () => {
    const msgs = [msg(VOL, S1, "private chat", 4)];
    const convs = buildConversations(staffContacts, msgs, admin);
    expect(convs.every((c) => c.items.length === 0)).toBe(true);
  });

  it("lets staff start a conversation with any student", () => {
    const convs = buildConversations(staffContacts, [], admin);
    expect(convs.map((c) => c.key).sort()).toEqual([MGR, S1, S2, VOL].sort());
  });

  it("sorts by latest activity", () => {
    const msgs = [msg(S1, ADMIN, "older", 60), msg(S2, MGR, "newer", 5)];
    const convs = buildConversations(staffContacts, msgs, admin);
    expect(convs[0]!.key).toBe(S2);
    expect(convs[1]!.key).toBe(S1);
  });
});

describe("recipient choice", () => {
  const staff = [
    person(ADMIN, "Ustadh Admin", "admin"),
    person(MGR, "Sister Manager", "manager"),
  ];

  it("defaults to an admin for a brand-new student", () => {
    expect(pickTeamRecipient(staff, [], S1)).toBe(ADMIN);
  });
  it("keeps replying to whoever answered last", () => {
    const thread = [msg(S1, ADMIN, "q", 30), msg(MGR, S1, "a", 10)];
    expect(pickTeamRecipient(staff, thread, S1)).toBe(MGR);
  });
  it("person conversations go to that person", () => {
    const conv = buildConversations(staffContacts, [], admin).find(
      (c) => c.key === S2,
    )!;
    expect(recipientFor(conv, staffContacts, ADMIN)).toBe(S2);
  });
  it("team conversation resolves to a staff id", () => {
    const conv = buildConversations(studentContacts, [], student)[0]!;
    expect(recipientFor(conv, studentContacts, S1)).toBe(ADMIN);
  });
  it("returns null when there is no staff to write to", () => {
    expect(pickTeamRecipient([], [], S1)).toBeNull();
  });
});

describe("day grouping", () => {
  const now = new Date(2026, 9, 28, 15, 0); // 28 Oct 2026, local time
  const at = (y: number, mo: number, d: number, h = 10) =>
    new Date(y, mo, d, h).toISOString();

  it("labels Today and Yesterday", () => {
    expect(dayLabel(at(2026, 9, 28, 9), now)).toBe("Today");
    expect(dayLabel(at(2026, 9, 27, 23), now)).toBe("Yesterday");
  });
  it("uses the weekday inside the last week and a date after that", () => {
    expect(dayLabel(at(2026, 9, 24), now)).toBe(
      new Date(2026, 9, 24).toLocaleDateString(undefined, { weekday: "long" }),
    );
    expect(dayLabel(at(2026, 8, 1), now)).toBe(
      new Date(2026, 8, 1).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
      }),
    );
    expect(dayLabel(at(2025, 11, 31), now)).toContain("2025");
  });
  it("groups chronologically and keeps same-day messages together", () => {
    const mk = (id: string, iso: string): Message => ({
      id,
      sender_id: S1,
      recipient_id: ADMIN,
      body: id,
      read_at: null,
      created_at: iso,
    });
    const groups = groupByDay(
      [
        mk("a", at(2026, 9, 26)),
        mk("b", at(2026, 9, 27, 8)),
        mk("c", at(2026, 9, 27, 20)),
        mk("d", at(2026, 9, 28, 1)),
      ],
      now,
    );
    expect(groups.map((g) => g.items.map((i) => i.id).join(""))).toEqual([
      "a",
      "bc",
      "d",
    ]);
    expect(groups.map((g) => g.label).slice(1)).toEqual(["Yesterday", "Today"]);
  });
});

describe("local list sync", () => {
  const base = (id: string, mins: number): Message => ({
    id,
    sender_id: S1,
    recipient_id: ADMIN,
    body: id,
    read_at: null,
    created_at: new Date(
      Date.UTC(2026, 9, 28, 12, 0) - mins * 60_000,
    ).toISOString(),
  });

  it("upsert replaces by id and keeps order", () => {
    const list = [base("a", 10), base("b", 5)];
    const out = upsertMessage(list, { ...base("a", 10), read_at: "now" });
    expect(out.map((m) => m.id)).toEqual(["a", "b"]);
    expect(out[0]!.read_at).toBe("now");
    expect(upsertMessage(out, base("c", 1)).map((m) => m.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });
  it("reconcile keeps unsent messages and drops confirmed duplicates", () => {
    const local = [
      base("a", 10),
      { ...base("p", 1), status: "sending" as const },
      { ...base("f", 2), status: "failed" as const },
    ];
    const server = [base("a", 10), base("p", 1)];
    const out = reconcile(local, server);
    expect(out.map((m) => m.id)).toEqual(["a", "f", "p"]);
    expect(out.find((m) => m.id === "p")!.status).toBeUndefined();
    expect(out.find((m) => m.id === "f")!.status).toBe("failed");
  });
});

describe("helpers", () => {
  it("makes initials", () => {
    expect(initials("Ustadh Admin")).toBe("UA");
    expect(initials("  single ")).toBe("S");
    expect(initials(null)).toBe("U");
  });
});
