import { createServerFn } from "@tanstack/react-start";
import { getRequestHeader } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

type AppRole = "admin" | "manager" | "volunteer" | "student";
const STAFF_ROLES: AppRole[] = ["admin", "manager", "volunteer"];
const ALL_CREATABLE_ROLES: AppRole[] = ["admin", "manager", "volunteer", "student"];

interface CreateUserInput {
  email: string;
  password: string;
  full_name?: string;
  role?: AppRole;
  gender?: string | null;
  age?: number | null;
  city?: string | null;
  country?: string | null;
  phone?: string | null;
}

function validate(input: unknown): CreateUserInput {
  const body = input as Partial<CreateUserInput> | null;
  const email = body?.email?.trim().toLowerCase();
  const password = body?.password || "";
  const requestedRole = body?.role || "student";
  if (!email || !email.includes("@")) throw new Error("Valid email is required");
  if (password.length < 6) throw new Error("Password must be at least 6 characters");
  if (!ALL_CREATABLE_ROLES.includes(requestedRole)) throw new Error("Invalid role");
  return { ...body, email, password, role: requestedRole };
}

export const staffCreateUser = createServerFn({ method: "POST" })
  .inputValidator(validate)
  .handler(async ({ data }) => {
    const supabaseUrl =
      process.env["SUPABASE_URL"] ?? process.env["VITE_SUPABASE_URL"];
    const serviceRoleKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Server is not configured for account creation");
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

    const { data: callerRoles, error: rolesError } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", caller.id);
    if (rolesError) throw new Error("Unable to verify permissions");

    const roleNames = (callerRoles || []).map((r: { role: string }) => r.role);
    const isAdminCaller = roleNames.includes("admin");
    const hasFullAccess = isAdminCaller || roleNames.includes("manager");
    const isVolunteerOnly = roleNames.includes("volunteer") && !hasFullAccess;

    if (!hasFullAccess && !isVolunteerOnly) throw new Error("Forbidden");

    const requestedRole = data.role ?? "student";
    const fullName = data.full_name?.trim() || data.email;

    if (isVolunteerOnly && requestedRole !== "student") {
      throw new Error("Volunteers can only create student accounts");
    }
    if (!hasFullAccess && STAFF_ROLES.includes(requestedRole)) {
      throw new Error("Only managers and admins can create staff accounts");
    }
    if (!isAdminCaller && requestedRole === "volunteer") {
      throw new Error("Only an admin can add volunteers");
    }

    const userMetadata = {
      full_name: fullName,
      gender: data.gender ?? null,
      age: typeof data.age === "number" ? data.age : null,
      city: data.city ?? null,
      country: data.country ?? null,
      phone: data.phone ?? null,
    };

    const { data: created, error: createError } =
      await adminClient.auth.admin.createUser({
        email: data.email,
        password: data.password,
        email_confirm: true,
        user_metadata: userMetadata,
      });
    if (createError || !created.user) {
      throw new Error(createError?.message || "Unable to create user");
    }

    const { error: profileError } = await adminClient.from("profiles").upsert(
      {
        user_id: created.user.id,
        full_name: fullName,
        gender: data.gender ?? null,
        age: typeof data.age === "number" ? data.age : null,
        city: data.city ?? null,
        country: data.country ?? null,
        phone: data.phone ?? null,
        email: data.email,
      },
      { onConflict: "user_id" },
    );
    if (profileError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw new Error(profileError.message);
    }

    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert(
        { user_id: created.user.id, role: requestedRole },
        { onConflict: "user_id,role" },
      );
    if (roleError) {
      await adminClient.auth.admin.deleteUser(created.user.id);
      throw new Error(roleError.message);
    }

    return { success: true, user_id: created.user.id, role: requestedRole };
  });
