import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  listTime,
  previewOf,
  type Conversation,
  type Directory,
  type Viewer,
} from "@/lib/messaging";
import { PersonAvatar } from "./PersonAvatar";

export type ListTab = "inbox" | "people";

type Props = {
  conversations: Conversation[];
  activeKey: string;
  onSelect: (key: string) => void;
  viewer: Viewer;
  dir: Directory;
  search: string;
  onSearch: (value: string) => void;
  /** Staff get an Inbox / People switch; students and volunteers see one simple list. */
  showTabs: boolean;
  tab: ListTab;
  onTab: (tab: ListTab) => void;
  loading: boolean;
  error: string;
  /** Which Supabase project this site is connected to (not secret). */
  project: string;
  onRetry: () => void;
  live: boolean;
};

export function ConversationList({
  conversations,
  activeKey,
  onSelect,
  viewer,
  dir,
  search,
  onSearch,
  showTabs,
  tab,
  onTab,
  loading,
  error,
  project,
  onRetry,
  live,
}: Props) {
  const q = search.trim().toLowerCase();
  const inboxCount = conversations.filter((c) => c.items.length > 0).length;
  const unreadTotal = conversations.reduce((n, c) => n + c.unread, 0);

  const matches = conversations.filter((c) => {
    if (q)
      return (
        c.title.toLowerCase().includes(q) ||
        c.subtitle.toLowerCase().includes(q) ||
        (c.last?.body || "").toLowerCase().includes(q)
      );
    if (showTabs && tab === "inbox") return c.items.length > 0;
    return true;
  });

  // A school can have thousands of students; draw the first screenfuls and let search find the rest.
  const MAX_ROWS = 200;
  const visible = matches.slice(0, MAX_ROWS);
  const hidden = matches.length - visible.length;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="space-y-3 p-4 pb-3">
        <div className="flex items-center justify-between gap-2">
          <h1 className="font-heading text-xl font-semibold tracking-tight">
            Messages
          </h1>
          <span
            className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
            title={
              live
                ? "New messages appear instantly"
                : "Reconnecting — new messages still arrive every few seconds"
            }
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full",
                live ? "bg-emerald-500" : "bg-amber-500 animate-pulse",
              )}
            />
            {live ? "Live" : "Reconnecting"}
          </span>
        </div>

        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            aria-label="Search conversations"
            placeholder="Search people or messages"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            className="h-10 pl-10"
          />
        </div>

        {showTabs && !q && (
          <div
            role="tablist"
            aria-label="Conversation filter"
            className="grid grid-cols-2 gap-1 rounded-full bg-secondary p-1 text-sm"
          >
            {(
              [
                [
                  "inbox",
                  `Inbox${unreadTotal ? ` · ${unreadTotal}` : inboxCount ? ` · ${inboxCount}` : ""}`,
                ],
                ["people", "All people"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                role="tab"
                aria-selected={tab === id}
                onClick={() => onTab(id)}
                className={cn(
                  "rounded-full px-3 py-1.5 font-medium transition-colors duration-200",
                  tab === id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3" role="list">
        {error && (
          <div className="space-y-3 p-3">
            <p className="text-sm text-muted-foreground">
              Messaging is temporarily unavailable. Please try again in a
              moment.
            </p>
            <Button size="sm" variant="outline" onClick={onRetry}>
              Retry
            </Button>
            <p className="break-words text-[11px] leading-snug text-muted-foreground">
              Reason: {error.slice(0, 220)}
              <br />
              Connected project: {project || "unknown"}
            </p>
          </div>
        )}

        {loading &&
          !error &&
          [0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="flex items-center gap-3 rounded-2xl p-3">
              <div className="h-11 w-11 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                <div className="h-2.5 w-3/4 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}

        {!loading && !error && visible.length === 0 && (
          <p className="p-4 text-center text-sm text-muted-foreground">
            {q
              ? "No conversations match your search."
              : showTabs && tab === "inbox"
                ? "No conversations yet. Open “All people” to message a student."
                : "No one is available to message yet."}
          </p>
        )}

        {!loading &&
          !error &&
          visible.map((c) => {
            const active = c.key === activeKey;
            return (
              <div key={c.key} role="listitem">
                <button
                  onClick={() => onSelect(c.key)}
                  aria-current={active ? "true" : undefined}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-2xl p-3 text-left transition-colors duration-200",
                    active ? "bg-secondary" : "hover:bg-secondary/60",
                  )}
                >
                  <PersonAvatar
                    name={c.title}
                    url={c.avatarUrl}
                    team={c.kind === "team"}
                    className="h-11 w-11"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "truncate text-sm",
                          c.unread ? "font-semibold" : "font-medium",
                        )}
                      >
                        {c.title}
                      </span>
                      {c.last && (
                        <span
                          className={cn(
                            "shrink-0 text-[11px]",
                            c.unread
                              ? "font-medium text-accent"
                              : "text-muted-foreground",
                          )}
                        >
                          {listTime(c.last.created_at)}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p
                        className={cn(
                          "truncate text-[13px]",
                          c.unread
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {previewOf(c, viewer, dir)}
                      </p>
                      {c.unread > 0 && (
                        <span
                          className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-accent-foreground"
                          aria-label={`${c.unread} unread`}
                        >
                          {c.unread > 99 ? "99+" : c.unread}
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              </div>
            );
          })}

        {!loading && !error && hidden > 0 && (
          <p className="p-4 text-center text-xs text-muted-foreground">
            Showing {visible.length} of {matches.length}. Use search to find
            anyone else.
          </p>
        )}
      </div>
    </div>
  );
}
