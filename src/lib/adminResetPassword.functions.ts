import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

interface ResetPasswordInput {
  user_id: string;
  new_password: string;
}

function validate(input: unknown): ResetPasswordInput {
  const body = input as Partial<ResetPasswordInput> | null;
  if (!body?.user_id || !body?.new_password) {
    throw new Error("user_id and new_password required");
  }
  if (typeof body.new_password !== "string" || body.new_password.length < 6) {
    throw new Error("Password must be at least 6 characters");
  }
  return { user_id: body.user_id, new_password: body.new_password };
}

export const adminResetPassword = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const supabaseUrl =
      process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server is not configured for password resets");
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = getRequestHeader("Authorization");
    if (!authHeader) throw new Error("No authorization");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
    } = await supabaseAdmin.auth.getUser(token);
    if (!caller) throw new Error("Invalid token");

    const { data: roles } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const allowed = roles?.some((r: { role: string }) =>
      ["admin", "manager"].includes(r.role),
    );
    if (!allowed) {
      throw new Error("Not authorized — admin or manager privileges required");
    }

    // Confirm the auth user exists
    const { data: targetData, error: targetError } =
      await supabaseAdmin.auth.admin.getUserById(data.user_id);
    if (targetError || !targetData?.user) {
      throw new Error("Student authentication account was not found");
    }

    // Update password + ensure email is confirmed so login is unblocked
    const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
      data.user_id,
      { password: data.new_password, email_confirm: true },
    );
    if (updateError) throw new Error(`Auth update failed: ${updateError.message}`);

    // Best-effort: revoke existing sessions so old tokens stop working.
    try {
      // @ts-expect-error supabase-js v2 admin.signOut accepts (userId, scope)
      await supabaseAdmin.auth.admin.signOut(data.user_id, "global");
    } catch {
      /* non-fatal */
    }

    return { success: true, user_id: data.user_id, email: targetData.user.email };
  });
