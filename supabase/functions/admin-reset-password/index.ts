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

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return json({ error: "Method not allowed" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Verify the caller is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "No authorization" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return json({ error: "Invalid token" }, 401);
    }

    // Check role — only admin or manager can reset passwords. Volunteers are explicitly blocked.
    const { data: roles } = await supabaseAdmin.from("user_roles").select("role").eq("user_id", caller.id);
    const allowed = roles?.some((r: any) => ["admin", "manager"].includes(r.role));
    if (!allowed) {
      return json({ error: "Not authorized — password reset requires admin or manager privileges" }, 403);
    }

    const { user_id, email, new_password } = await req.json();
    const targetEmailFromClient = normalizeEmail(email);

    if (!user_id || !new_password) {
      return json({ error: "user_id and new_password required" }, 400);
    }

    if (new_password.length < 6) {
      return json({ error: "Password must be at least 6 characters" }, 400);
    }

    const { data: targetData, error: targetError } = await supabaseAdmin.auth.admin.getUserById(user_id);
    const targetUser = targetData?.user;
    if (targetError || !targetUser) {
      return json({ error: "Student authentication account was not found" }, 404);
    }

    const authEmail = normalizeEmail(targetUser.email);
    if (!authEmail) {
      return json({ error: "Selected student does not have an email login account" }, 400);
    }

    if (targetEmailFromClient && targetEmailFromClient !== authEmail) {
      return json({ error: `Selected student mismatch. This reset targets ${authEmail}, not ${targetEmailFromClient}. Refresh the page and choose the correct student account.` }, 409);
    }

    const { error } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
      password: new_password,
      email_confirm: true,
    });
    if (error) {
      return json({ error: `Auth update failed: ${error.message}` }, 400);
    }

    const authVerifier = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data: loginCheck, error: loginCheckError } = await authVerifier.auth.signInWithPassword({
      email: authEmail,
      password: new_password,
    });

    if (loginCheckError || !loginCheck.session?.access_token) {
      return json({ error: `Password update did not sync to login for ${authEmail}. ${loginCheckError?.message || "Verification failed"}` }, 500);
    }

    // Revoke all sessions for this student using a real student JWT. Passing the
    // user id here does not revoke sessions; the auth API requires an access token.
    try {
      await supabaseAdmin.auth.admin.signOut(loginCheck.session.access_token, "global");
    } catch (_) {
      // non-fatal — password is already updated
    }

    return json({ success: true, user_id, email: authEmail });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return json({ error: msg }, 500);
  }
});
