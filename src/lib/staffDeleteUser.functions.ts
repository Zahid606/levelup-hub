import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

interface DeleteUserInput {
  user_id: string;
}

function validate(input: unknown): DeleteUserInput {
  const body = input as Partial<DeleteUserInput> | null;
  if (!body?.user_id) throw new Error("user_id is required");
  return { user_id: body.user_id };
}

export const staffDeleteUser = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const supabaseUrl =
      process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server is not configured for account deletion");
    }
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const authHeader = getRequestHeader("Authorization");
    if (!authHeader?.startsWith("Bearer ")) throw new Error("Unauthorized");

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user: caller },
    } = await adminClient.auth.getUser(token);
    if (!caller) throw new Error("Unauthorized");

    const { data: callerRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    const roleNames = (callerRoles || []).map((r: { role: string }) => r.role);
    const hasFullAccess =
      roleNames.includes("admin") || roleNames.includes("manager");
    if (!hasFullAccess) {
      throw new Error("Forbidden — only managers and admins can remove staff");
    }

    const targetId = data.user_id;
    if (targetId === caller.id) {
      throw new Error("You cannot remove your own account");
    }

    // Clean up dependent rows first
    await adminClient.from("volunteer_assignments").delete().eq("volunteer_id", targetId);
    await adminClient.from("volunteer_assignments").delete().eq("student_id", targetId);
    await adminClient.from("volunteer_reports").delete().eq("volunteer_id", targetId);
    await adminClient.from("volunteer_reports").delete().eq("student_id", targetId);
    await adminClient.from("notifications").delete().eq("user_id", targetId);
    await adminClient.from("quiz_answers").delete().eq("user_id", targetId);
    await adminClient.from("user_progress").delete().eq("user_id", targetId);
    await adminClient.from("user_points").delete().eq("user_id", targetId);
    await adminClient.from("gifts").delete().eq("user_id", targetId);
    await adminClient.from("user_roles").delete().eq("user_id", targetId);
    await adminClient.from("profiles").delete().eq("user_id", targetId);

    const { error: delErr } = await adminClient.auth.admin.deleteUser(targetId);
    if (delErr) throw new Error(delErr.message);

    return { success: true };
  });
