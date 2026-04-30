import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) return json({ error: "Unauthorized" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) return json({ error: "Unauthorized" }, 401);

    const callerId = claimsData.claims.sub;
    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    const roleNames = (callerRoles || []).map((r: { role: string }) => r.role);
    const hasFullAccess = roleNames.includes("admin") || roleNames.includes("manager");
    if (!hasFullAccess) return json({ error: "Forbidden — only managers and admins can remove staff" }, 403);

    const body = await req.json().catch(() => null) as { user_id?: string } | null;
    const targetId = body?.user_id;
    if (!targetId) return json({ error: "user_id is required" }, 400);
    if (targetId === callerId) return json({ error: "You cannot remove your own account" }, 400);

    // Clean up dependent rows first
    await adminClient.from("quiz_answers").delete().eq("user_id", targetId);
    await adminClient.from("user_progress").delete().eq("user_id", targetId);
    await adminClient.from("user_points").delete().eq("user_id", targetId);
    await adminClient.from("gifts").delete().eq("user_id", targetId);
    await adminClient.from("user_roles").delete().eq("user_id", targetId);
    await adminClient.from("profiles").delete().eq("user_id", targetId);

    const { error: delErr } = await adminClient.auth.admin.deleteUser(targetId);
    if (delErr) return json({ error: delErr.message }, 400);

    return json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
