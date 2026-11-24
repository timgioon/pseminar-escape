import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeUsername(value: string): string {
  return value.trim().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const publishableMap = JSON.parse(Deno.env.get("SUPABASE_PUBLISHABLE_KEYS") || "{}");
  const secretMap = JSON.parse(Deno.env.get("SUPABASE_SECRET_KEYS") || "{}");
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || publishableMap.default;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || secretMap.default;
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Server configuration missing" }, 500);

  const authHeader = req.headers.get("Authorization");
  if (!authHeader) return json({ error: "Authentication required" }, 401);

  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: authData, error: authError } = await callerClient.auth.getUser();
  if (authError || !authData.user) return json({ error: "Invalid session" }, 401);

  const { data: callerProfile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, project_id, role, team_id")
    .eq("id", authData.user.id)
    .single();
  if (profileError || !callerProfile) return json({ error: "Profile not found" }, 403);
  if (!["admin", "team_lead"].includes(callerProfile.role)) return json({ error: "Insufficient permissions" }, 403);

  let input: { username?: string; access_code?: string; role?: string; team_id?: string };
  try { input = await req.json(); } catch { return json({ error: "Invalid JSON" }, 400); }

  const displayName = String(input.username || "").trim();
  const normalized = normalizeUsername(displayName);
  const accessCode = String(input.access_code || "").trim();
  const role = String(input.role || "member");
  const teamId = String(input.team_id || "");

  if (!displayName || displayName.length > 64 || !normalized) return json({ error: "A valid username (1–64 characters) is required" }, 400);
  if (accessCode.length < 8 || accessCode.length > 128) return json({ error: "Access code must contain at least 8 characters" }, 400);
  if (!["member", "team_lead"].includes(role)) return json({ error: "Invalid role" }, 400);
  if (!["marketing", "design", "raetsel"].includes(teamId)) return json({ error: "Invalid team" }, 400);
  if (callerProfile.role === "team_lead" && (role !== "member" || callerProfile.team_id !== teamId)) {
    return json({ error: "Team leads may only add members to their own team" }, 403);
  }

  const { data: existing } = await adminClient
    .from("profiles")
    .select("id")
    .eq("project_id", callerProfile.project_id)
    .eq("username_normalized", normalized)
    .maybeSingle();
  if (existing) return json({ error: "This username is already in use" }, 409);

  const email = `${normalized}@login.seminar-escape.invalid`;
  const { data: createdAuth, error: createAuthError } = await adminClient.auth.admin.createUser({
    email,
    password: accessCode,
    email_confirm: true,
    user_metadata: { username: displayName },
  });
  if (createAuthError || !createdAuth.user) return json({ error: createAuthError?.message || "Could not create account" }, 400);

  const { error: insertProfileError } = await adminClient.from("profiles").insert({
    id: createdAuth.user.id,
    project_id: callerProfile.project_id,
    username: displayName,
    username_normalized: normalized,
    display_name: displayName,
    role,
    team_id: teamId,
  });
  if (insertProfileError) {
    await adminClient.auth.admin.deleteUser(createdAuth.user.id);
    return json({ error: insertProfileError.message }, 400);
  }

  return json({
    id: createdAuth.user.id,
    username: displayName,
    display_name: displayName,
    role,
    team_id: teamId,
    message: "Account created. Share the access code with the user securely.",
  }, 201);
});
