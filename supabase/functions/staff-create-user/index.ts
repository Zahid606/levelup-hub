import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

type AppRole = "admin" | "manager" | "volunteer" | "student";
const STAFF_ROLES: AppRole[] = ["admin", "manager", "volunteer"];
const ALL_CREATABLE_ROLES: AppRole[] = ["admin", "manager", "volunteer", "student"];

function json(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return json({ error: "Unauthorized" }, 401);
    }

    const callerId = claimsData.claims.sub;
    const { data: callerRoles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId);

    if (rolesError) {
      return json({ error: "Unable to verify permissions" }, 403);
    }

    const roleNames = (callerRoles || []).map((r: { role: string }) => r.role);
    const hasFullAccess = roleNames.includes("admin") || roleNames.includes("manager");
    const isVolunteerOnly = roleNames.includes("volunteer") && !hasFullAccess;

    if (!hasFullAccess && !isVolunteerOnly) {
      return json({ error: "Forbidden" }, 403);
    }

    const body = await req.json().catch(() => null) as Partial<{
      email: string;
      password: string;
      full_name: string;
      role: AppRole;
      gender: string | null;
      age: number | null;
      city: string | null;
      country: string | null;
      phone: string | null;
    }> | null;

    const email = body?.email?.trim().toLowerCase();
    const password = body?.password || "";
    const fullName = body?.full_name?.trim() || email;
    const requestedRole = body?.role || "student";

    if (!email || !email.includes("@")) return json({ error: "Valid email is required" }, 400);
    if (password.length < 6) return json({ error: "Password must be at least 6 characters" }, 400);
    if (!ALL_CREATABLE_ROLES.includes(requestedRole)) return json({ error: "Invalid role" }, 400);
    if (isVolunteerOnly && requestedRole !== "student") {
      return json({ error: "Volunteers can only create student accounts" }, 403);
    }
    if (!hasFullAccess && STAFF_ROLES.includes(requestedRole)) {
      return json({ error: "Only managers and admins can create staff accounts" }, 403);
    }

    const userMetadata = {
      full_name: fullName,
      gender: body?.gender ?? null,
      age: typeof body?.age === "number" ? body.age : null,
      city: body?.city ?? null,
      country: body?.country ?? null,
      phone: body?.phone ?? null,
    };

    const { data: created, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: userMetadata,
    });

    if (createError || !created.user) {
      return json({ error: createError?.message || "Unable to create user" }, 400);
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        user_id: created.user.id,
        full_name: fullName,
        gender: body?.gender ?? null,
        age: typeof body?.age === "number" ? body.age : null,
        city: body?.city ?? null,
        country: body?.country ?? null,
        phone: body?.phone ?? null,
        email,
      }, { onConflict: "user_id" });

    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: profileError.message }, 400);
    }

    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: created.user.id, role: requestedRole }, { onConflict: "user_id,role" });

    if (roleError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      return json({ error: roleError.message }, 400);
    }

    return json({ success: true, user_id: created.user.id, role: requestedRole });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return json({ error: message }, 500);
  }
});
