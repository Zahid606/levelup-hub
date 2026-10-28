import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

interface Input {
  id: string;
}

function validate(input: unknown): Input {
  const id = (input as Partial<Input> | null)?.id;
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id))
    throw new Error("A message id is required");
  return { id };
}

/**
 * Sends a device notification (works with the app closed) for one new chat message.
 * Best effort: when push is not configured on the server it quietly does nothing, and the
 * in-app notification bell, badges and toasts still work.
 */
export const sendMessagePush = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const supabaseUrl =
      process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    const vapidPublic = process.env["VAPID_PUBLIC_KEY"];
    const vapidPrivate = process.env["VAPID_PRIVATE_KEY"];
    const subject = process.env["VAPID_SUBJECT"] ?? "mailto:admin@example.com";
    if (!supabaseUrl || !serviceRoleKey || !vapidPublic || !vapidPrivate)
      return { sent: 0, skipped: true };

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Only the person who wrote the message can trigger its notification.
    const authHeader = getRequestHeader("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");
    const {
      data: { user: caller },
    } = await admin.auth.getUser(authHeader.replace("Bearer ", ""));
    if (!caller) throw new Error("Unauthorized");

    const { data: msg } = await admin
      .from("messages")
      .select("id, sender_id, recipient_id, body, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (!msg || msg.sender_id !== caller.id) throw new Error("Forbidden");
    if (Date.now() - new Date(msg.created_at).getTime() > 5 * 60_000)
      return { sent: 0, skipped: true };

    // A message to any admin/manager is a message to the whole team.
    const { data: staffRows } = await admin
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "manager"]);
    const staff = new Set(
      (staffRows || []).map((r: { user_id: string }) => r.user_id),
    );
    let targets = [msg.recipient_id as string];
    if (staff.has(msg.recipient_id) && !staff.has(msg.sender_id))
      targets = [...staff];
    targets = targets.filter((id) => id !== msg.sender_id);
    if (targets.length === 0) return { sent: 0 };

    const [{ data: subs }, { data: profile }] = await Promise.all([
      admin
        .from("push_subscriptions")
        .select("id,endpoint,p256dh,auth")
        .in("user_id", targets),
      admin
        .from("profiles")
        .select("full_name")
        .eq("user_id", msg.sender_id)
        .maybeSingle(),
    ]);
    const subscriptions = (subs || []) as Array<{
      id: string;
      endpoint: string;
      p256dh: string;
      auth: string;
    }>;
    if (subscriptions.length === 0) return { sent: 0 };

    const { setWebCrypto, ApplicationServerKeys, generatePushHTTPRequest } =
      await import("webpush-webcrypto");
    setWebCrypto(globalThis.crypto);
    const keys = await ApplicationServerKeys.fromJSON({
      publicKey: vapidPublic,
      privateKey: vapidPrivate,
    });

    const sender =
      (profile as { full_name?: string | null } | null)?.full_name?.trim() ||
      "Someone";
    const body = String(msg.body).replace(/\s+/g, " ").trim();
    const payload = JSON.stringify({
      title: `New message from ${sender}`,
      body: body.length > 140 ? `${body.slice(0, 137)}…` : body,
      url: "/messages",
      tag: `message-${msg.sender_id}`,
      actionLabel: "Open",
    });

    const stale: string[] = [];
    let sent = 0;
    await Promise.all(
      subscriptions.map(async (sub) => {
        try {
          const req = await generatePushHTTPRequest({
            payload,
            applicationServerKeys: keys,
            target: {
              endpoint: sub.endpoint,
              keys: { p256dh: sub.p256dh, auth: sub.auth },
            },
            adminContact: subject,
            ttl: 60 * 60 * 24,
            urgency: "high",
          });
          const res = await fetch(req.endpoint, {
            method: "POST",
            headers: req.headers,
            body: req.body as BodyInit,
          });
          if (res.status === 404 || res.status === 410) stale.push(sub.id);
          else if (res.ok) sent += 1;
          else
            console.error(
              `message push failed [${res.status}]: ${await res.text()}`,
            );
        } catch (err) {
          console.error("message push error", err);
        }
      }),
    );
    if (stale.length > 0)
      await admin.from("push_subscriptions").delete().in("id", stale);
    return { sent };
  });
