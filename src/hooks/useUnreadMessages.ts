import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Number of unread chat messages for the signed-in person (for staff this includes messages
 * written to the Admin Team). Updates live, and falls back to light polling.
 */
export function useUnreadMessages(): number {
  const { user } = useAuth();
  const [count, setCount] = useState(0);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const load = useCallback(async () => {
    if (!user) {
      setCount(0);
      return;
    }
    const { data, error } = await supabase.rpc("get_unread_message_count");
    if (!error && typeof data === "number") {
      setCount(data);
      return;
    }
    // Database function not installed yet: count what was addressed to me directly.
    const { count: direct } = await supabase
      .from("messages")
      .select("id", { count: "exact", head: true })
      .eq("recipient_id", user.id)
      .is("read_at", null);
    setCount(direct ?? 0);
  }, [user]);

  // Several events can arrive together (a read receipt for a whole thread): refresh once.
  const soon = useCallback(() => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => void load(), 250);
  }, [load]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel(`unread-messages:${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages" },
        soon,
      )
      .subscribe();
    const onRead = () => soon();
    const onVisible = () => {
      if (document.visibilityState === "visible") soon();
    };
    window.addEventListener("messages:read", onRead);
    document.addEventListener("visibilitychange", onVisible);
    const poll = setInterval(() => {
      if (document.visibilityState === "visible") void load();
    }, 60_000);
    return () => {
      clearTimeout(timer.current);
      clearInterval(poll);
      window.removeEventListener("messages:read", onRead);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [user, load, soon]);

  return count;
}
