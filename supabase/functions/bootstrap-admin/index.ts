import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const email = "admin@gmail.com";
    const password = "Admin@123";

    // Check if user already exists
    const { data: list } = await supabaseAdmin.auth.admin.listUsers();
    let user = list?.users?.find((u: any) => u.email === email);

    if (!user) {
      const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: "Administrator" },
      });
      if (createErr) throw createErr;
      user = created.user;
    } else {
      // Reset password to known value
      await supabaseAdmin.auth.admin.updateUserById(user.id, { password, email_confirm: true });
    }

    if (!user) throw new Error("Could not create or fetch user");

    // Remove any 'student' role and assign 'admin'
    await supabaseAdmin.from("user_roles").delete().eq("user_id", user.id);
    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: user.id, role: "admin" });
    if (roleErr) throw roleErr;

    return new Response(
      JSON.stringify({ success: true, email, message: "Admin account ready. Log in at /admin-login." }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
