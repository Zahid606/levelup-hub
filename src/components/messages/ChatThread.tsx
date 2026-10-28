import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  AlertCircle,
  ArrowDown,
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  MessageSquare,
  Send,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import {
  MAX_MESSAGE_LENGTH,
  groupByDay,
  roleLabel,
  type Conversation,
  type Directory,
  type Message,
  type Viewer,
} from "@/lib/messaging";
import { PersonAvatar } from "./PersonAvatar";

type Props = {
  conv: Conversation | undefined;
  viewer: Viewer;
  dir: Directory;
  draft: string;
  onDraft: (value: string) => void;
  onSend: () => void;
  onRetry: (m: Message) => void;
  onDelete?: ((m: Message) => void) | undefined;
  onBack: () => void;
  /** Nobody to address messages to (e.g. no admin exists yet). */
  canSend: boolean;
};

const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

function Ticks({ m }: { m: Message }) {
  if (m.status === "sending")
    return <Clock className="h-3 w-3" aria-label="Sending" />;
  if (m.read_at)
    return <CheckCheck className="h-3.5 w-3.5" aria-label="Seen" />;
  return <Check className="h-3.5 w-3.5" aria-label="Sent" />;
}

export function ChatThread({
  conv,
  viewer,
  dir,
  draft,
  onDraft,
  onSend,
  onRetry,
  onDelete,
  onBack,
  canSend,
}: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickRef = useRef(true);
  const [showJump, setShowJump] = useState(false);
  const [confirm, setConfirm] = useState<Message | null>(null);
  const [touch, setTouch] = useState(false);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setTouch(
      typeof window !== "undefined" &&
        window.matchMedia?.("(pointer: coarse)").matches === true,
    );
  }, []);

  const toBottom = (smooth: boolean) => {
    const el = scrollRef.current;
    if (el)
      el.scrollTo({
        top: el.scrollHeight,
        behavior: smooth ? "smooth" : "auto",
      });
  };

  // Opening a conversation always starts at the newest message.
  useLayoutEffect(() => {
    stickRef.current = true;
    setShowJump(false);
    toBottom(false);
  }, [conv?.key]);

  // New message: follow it if the reader is at the bottom (or wrote it), otherwise offer a jump button.
  const count = conv?.items.length ?? 0;
  const lastMine = conv?.items.at(-1)?.sender_id === viewer.id;
  useEffect(() => {
    if (count === 0) return;
    if (stickRef.current || lastMine) toBottom(true);
    else setShowJump(true);
  }, [count, lastMine]);

  // Grow the box with the text, up to a limit.
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [draft, conv?.key]);

  if (!conv) {
    return (
      <div className="m-auto flex flex-col items-center gap-3 p-8 text-center text-muted-foreground">
        <div className="rounded-full bg-secondary p-5">
          <MessageSquare className="h-8 w-8 opacity-60" aria-hidden />
        </div>
        <p className="text-sm font-medium text-foreground">
          Select a conversation
        </p>
        <p className="max-w-xs text-sm">
          Choose someone from the list to read earlier messages or write a new
          one.
        </p>
      </div>
    );
  }

  const groups = groupByDay(conv.items);
  const sharedThread = conv.kind === "team" || viewer.isStaff;
  const over = draft.length > MAX_MESSAGE_LENGTH;
  const canPress = canSend && draft.trim().length > 0 && !over;

  const onKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Phones: Enter adds a new line and the button sends. Computers: Enter sends, Shift+Enter adds a line.
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !touch &&
      !e.nativeEvent.isComposing
    ) {
      e.preventDefault();
      if (canPress) onSend();
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-border/60 px-3 py-3 md:px-5">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 md:hidden"
          onClick={onBack}
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <PersonAvatar
          name={conv.title}
          url={conv.avatarUrl}
          team={conv.kind === "team"}
        />
        <div className="min-w-0">
          <h2 className="truncate text-[15px] font-semibold leading-tight">
            {conv.title}
          </h2>
          <p className="truncate text-xs text-muted-foreground">
            {conv.kind === "team"
              ? "Any admin or manager can reply"
              : conv.subtitle}
          </p>
        </div>
      </header>

      <div className="relative min-h-0 flex-1">
        <div
          ref={scrollRef}
          onScroll={() => {
            const el = scrollRef.current;
            if (!el) return;
            const near = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
            stickRef.current = near;
            if (near) setShowJump(false);
          }}
          role="log"
          aria-live="polite"
          aria-label={`Conversation with ${conv.title}`}
          className="h-full overflow-y-auto px-3 py-4 md:px-6"
        >
          {groups.length === 0 && (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <MessageSquare className="h-8 w-8 opacity-40" aria-hidden />
              <p className="text-sm">No messages yet. Say hello 👋</p>
            </div>
          )}

          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <div className="sticky top-0 z-10 my-3 flex justify-center">
                <span className="rounded-full bg-secondary/90 px-3 py-1 text-[11px] font-medium text-muted-foreground backdrop-blur">
                  {group.label}
                </span>
              </div>

              {group.items.map((m, i) => {
                const mine = m.sender_id === viewer.id;
                const prev = group.items[i - 1];
                const startsRun = !prev || prev.sender_id !== m.sender_id;
                const sender = dir.byId.get(m.sender_id);
                const showName = !mine && sharedThread && startsRun;
                const canDelete = !!onDelete && !m.status;

                return (
                  <div
                    key={m.id}
                    className={cn(
                      "flex",
                      mine ? "justify-end" : "justify-start",
                      startsRun ? "mt-3" : "mt-1",
                    )}
                  >
                    <div
                      className={cn(
                        "flex max-w-[88%] flex-col md:max-w-[70%]",
                        mine ? "items-end" : "items-start",
                      )}
                    >
                      {showName && (
                        <p className="mb-1 ml-3 text-[11px] font-medium text-muted-foreground">
                          {sender?.full_name || "User"}
                          {sender && (
                            <span className="ml-1.5 font-normal opacity-70">
                              {roleLabel(sender.role)}
                            </span>
                          )}
                        </p>
                      )}
                      <div
                        className={cn(
                          "group relative rounded-3xl px-4 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.03)]",
                          mine
                            ? "rounded-br-lg bg-accent text-accent-foreground"
                            : "rounded-bl-lg bg-secondary text-foreground",
                          m.status === "sending" && "opacity-70",
                          m.status === "failed" && "ring-2 ring-destructive/60",
                        )}
                      >
                        <p
                          dir="auto"
                          className="whitespace-pre-wrap break-words text-[15px] leading-snug md:text-sm"
                        >
                          {m.body}
                        </p>
                        <div
                          className={cn(
                            "mt-1 flex items-center justify-end gap-1.5 text-[10px]",
                            mine
                              ? "text-accent-foreground/75"
                              : "text-muted-foreground",
                          )}
                        >
                          <time dateTime={m.created_at}>
                            {clock(m.created_at)}
                          </time>
                          {mine && m.status !== "failed" && <Ticks m={m} />}
                          {canDelete && (
                            <button
                              onClick={() => setConfirm(m)}
                              className="rounded p-0.5 opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-60"
                              aria-label="Delete message"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      {m.status === "failed" && (
                        <button
                          onClick={() => onRetry(m)}
                          className="mt-1 flex items-center gap-1 text-[11px] font-medium text-destructive hover:underline"
                        >
                          <AlertCircle className="h-3 w-3" /> Not sent. Tap to
                          retry
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </section>
          ))}
        </div>

        {showJump && (
          <Button
            size="sm"
            onClick={() => {
              toBottom(true);
              setShowJump(false);
            }}
            className="absolute bottom-3 left-1/2 h-9 -translate-x-1/2 gap-1.5 shadow-lg"
          >
            <ArrowDown className="h-4 w-4" /> New messages
          </Button>
        )}
      </div>

      <div className="border-t border-border/60 p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:px-5">
        <div className="flex items-end gap-2">
          <Textarea
            ref={area}
            rows={1}
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={onKey}
            enterKeyHint={touch ? "enter" : "send"}
            aria-label="Write a message"
            dir="auto"
            placeholder={
              canSend
                ? "Write a message…"
                : "No one is available to receive messages yet"
            }
            disabled={!canSend}
            className="max-h-36 min-h-11 resize-none rounded-3xl px-4 py-3 text-base md:text-sm"
          />
          <Button
            onClick={onSend}
            disabled={!canPress}
            size="icon"
            className="h-11 w-11 shrink-0"
            aria-label="Send message"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {draft.length > MAX_MESSAGE_LENGTH - 500 && (
          <p
            className={cn(
              "mt-1 text-right text-[11px]",
              over ? "text-destructive" : "text-muted-foreground",
            )}
          >
            {draft.length}/{MAX_MESSAGE_LENGTH}
          </p>
        )}
      </div>

      <AlertDialog
        open={!!confirm}
        onOpenChange={(open) => !open && setConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this message?</AlertDialogTitle>
            <AlertDialogDescription>
              It will be removed for everyone in this conversation. This cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm && onDelete) onDelete(confirm);
                setConfirm(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
