import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) return json({ error: "Invalid token" }, 401);

    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const allowed = roles?.some((r: any) => ["admin", "manager"].includes(r.role));
    if (!allowed) return json({ error: "Not authorized — admin or manager privileges required" }, 403);

    const { user_id, new_password } = await req.json();

    if (!user_id || !new_password) return json({ error: "user_id and new_password required" }, 400);
    if (typeof new_password !== "string" || new_password.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, 400);
    }

    // Confirm the auth user exists
    const { data: targetData, error: targetError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    if (targetError || !targetData?.user) {
      return json({ error: "Student authentication account was not found" }, 404);
    }

    // Update password + ensure email is confirmed so login is unblocked
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
      email_confirm: true,
    });
    if (updateError) return json({ error: `Auth update failed: ${updateError.message}` }, 400);

    // Best-effort: revoke existing sessions so old tokens stop working.
    // Non-fatal if it fails — the new password is already saved.
    try {
      // @ts-ignore - supabase-js v2 supports (userId, scope)
      await supabaseAdmin.auth.admin.signOut(user_id, "global");
    } catch (_) { /* ignore */ }

    return json({ success: true, user_id, email: targetData.user.email });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});
