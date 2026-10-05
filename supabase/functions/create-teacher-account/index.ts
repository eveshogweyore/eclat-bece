import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let newUserId: string | null = null;

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization") || "";
    if (!authHeader.toLowerCase().startsWith("bearer ")) {
      return json({ error: "Unauthorized" }, 401);
    }

    const token = authHeader.replace(/^[Bb]earer\s+/, "").trim();
    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: userData, error: userError } = await userClient.auth.getUser(token);

    if (userError || !userData.user) {
      return json({ error: "Invalid token" }, 401);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Only schools provision teacher accounts.
    const { data: schoolRecord } = await adminClient
      .from("schools")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!schoolRecord) {
      return json({ error: "Only schools can provision teacher accounts" }, 403);
    }

    const { action, teacher_id: teacherId, email, password } = await req.json();
    const cleanEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
    const cleanPassword = typeof password === "string" ? password : "";
    const cleanTeacherId = typeof teacherId === "string" ? teacherId.trim() : "";

    if (!cleanTeacherId) {
      return json({ error: "teacher_id is required" }, 400);
    }

    // The teacher row must belong to the caller's school.
    const { data: teacherRow, error: teacherError } = await adminClient
      .from("school_teachers")
      .select("id, user_id, full_name, email, school_id")
      .eq("id", cleanTeacherId)
      .eq("school_id", schoolRecord.id)
      .maybeSingle();

    if (teacherError) throw teacherError;
    if (!teacherRow) {
      return json({ error: "Teacher not found in your school" }, 404);
    }

    if (action === "reset-password") {
      // Reset password for an already-linked teacher.
      if (!teacherRow.user_id) {
        return json({ error: "This teacher has no login account yet. Create one first." }, 400);
      }
      if (cleanPassword.length < 6 || cleanPassword.length > 100) {
        return json({ error: "Password must be between 6 and 100 characters" }, 400);
      }
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(
        teacherRow.user_id,
        { password: cleanPassword }
      );
      if (updateErr) throw updateErr;
      return json({ success: true, message: "Teacher password updated" });
    }

    if (action === "revoke-login") {
      // Remove the teacher's login account entirely. auth.users deletion
      // cascades user_roles/profiles; school_teachers.user_id is SET NULL by
      // its FK, so the registry row survives without a login.
      if (!teacherRow.user_id) {
        return json({ error: "This teacher has no login account" }, 400);
      }
      const { error: deleteErr } = await adminClient.auth.admin.deleteUser(teacherRow.user_id);
      if (deleteErr) throw deleteErr;
      return json({ success: true, message: "Teacher login revoked" });
    }

    // Default action: create-and-link a new login account.
    if (teacherRow.user_id) {
      return json({ error: "This teacher already has a login account" }, 409);
    }

    const loginEmail = cleanEmail || (teacherRow.email || "").trim().toLowerCase();
    if (!emailPattern.test(loginEmail)) {
      return json({ error: "A valid email address is required" }, 400);
    }
    if (cleanPassword.length < 6 || cleanPassword.length > 100) {
      return json({ error: "Password must be between 6 and 100 characters" }, 400);
    }

    const { data: existingProfile, error: profileLookupErr } = await adminClient
      .from("profiles")
      .select("id")
      .eq("email", loginEmail)
      .maybeSingle();
    if (profileLookupErr) throw profileLookupErr;
    if (existingProfile) {
      return json({ error: "An account with this email already exists" }, 409);
    }

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: loginEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: {
        role: "teacher",
        full_name: teacherRow.full_name,
        provisioned_by: "school",
      },
      app_metadata: {
        role: "teacher",
        provisioned_by: "school",
        school_id: schoolRecord.id,
      },
    });

    if (createError || !newUser.user) {
      return json({ error: createError?.message || "Failed to create teacher account" }, 400);
    }

    newUserId = newUser.user.id;

    const rollbackUser = async () => {
      if (newUserId) {
        await adminClient.auth.admin.deleteUser(newUserId);
      }
    };

    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: newUserId, role: "teacher" }, { onConflict: "user_id,role" });
    if (roleError) {
      await rollbackUser();
      throw roleError;
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUserId,
        email: loginEmail,
        full_name: teacherRow.full_name,
        email_verified: true,
      }, { onConflict: "id" });
    if (profileError) {
      await rollbackUser();
      throw profileError;
    }

    const { error: linkError } = await adminClient
      .from("school_teachers")
      .update({ user_id: newUserId })
      .eq("id", teacherRow.id);
    if (linkError) {
      await rollbackUser();
      throw linkError;
    }

    return json({
      success: true,
      teacher: {
        id: teacherRow.id,
        user_id: newUserId,
        full_name: teacherRow.full_name,
        email: loginEmail,
      },
    });
  } catch (error) {
    console.error("create-teacher-account error:", error);
    if (newUserId) {
      const adminClient = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await adminClient.auth.admin.deleteUser(newUserId).catch(() => {});
    }
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
