import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const usernamePattern = /^[a-z0-9._-]{2,20}$/;
const allowedClassYears = new Set(["year_6", "year_9"]);

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

    const { data: parentRecord } = await adminClient
      .from("parents")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const { data: schoolRecord } = await adminClient
      .from("schools")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!parentRecord && !schoolRecord) return json({ error: "Only parents or schools can create student accounts" }, 403);

    const { fullName, classYear, username, password, classId } = await req.json();
    const cleanFullName = typeof fullName === "string" ? fullName.trim() : "";
    const cleanClassYear = typeof classYear === "string" ? classYear.trim() : "";
    const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
    const cleanPassword = typeof password === "string" ? password : "";
    const cleanClassId = typeof classId === "string" && classId.trim().length > 0 ? classId.trim() : null;

    if (!cleanFullName || !cleanClassYear || !normalizedUsername || !cleanPassword) {
      return json({ error: "Missing required fields" }, 400);
    }

    if (cleanFullName.length < 2 || cleanFullName.length > 100) {
      return json({ error: "Full name must be between 2 and 100 characters" }, 400);
    }

    if (!allowedClassYears.has(cleanClassYear)) {
      return json({ error: "Invalid class year" }, 400);
    }

    if (!usernamePattern.test(normalizedUsername)) {
      return json({
        error: "Username must be 2-20 characters and may only contain letters, numbers, dots, underscores, or hyphens",
      }, 400);
    }

    if (cleanPassword.length < 6 || cleanPassword.length > 100) {
      return json({ error: "Password must be between 6 and 100 characters" }, 400);
    }

    // classId is client-supplied and the service-role insert below bypasses
    // RLS, so ownership is verified here: only schools may assign a class, and
    // only one of their own.
    if (cleanClassId) {
      if (!schoolRecord) {
        return json({ error: "Only schools can assign students to classes" }, 403);
      }
      const { data: classRecord, error: classError } = await adminClient
        .from("school_classes")
        .select("id")
        .eq("id", cleanClassId)
        .eq("school_id", schoolRecord.id)
        .maybeSingle();
      if (classError) {
        throw classError;
      }
      if (!classRecord) {
        return json({ error: "Class not found in your school" }, 400);
      }
    }

    const { data: existingProfile, error: usernameError } = await adminClient
      .from("profiles")
      .select("id")
      .eq("username", normalizedUsername)
      .maybeSingle();

    if (usernameError) {
      throw usernameError;
    }

    if (existingProfile) {
      return json({ error: "Username is already taken" }, 409);
    }

    const dummyEmail = `${normalizedUsername}@student.eclat.com`;

    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: dummyEmail,
      password: cleanPassword,
      email_confirm: true,
      user_metadata: {
        role: "student",
        full_name: cleanFullName,
        provisioned_by: parentRecord ? "parent" : "school",
      },
      app_metadata: {
        role: "student",
        provisioned_by: parentRecord ? "parent" : "school",
        ...(parentRecord ? { parent_id: parentRecord.id } : { school_id: schoolRecord.id }),
      },
    });

    if (createError || !newUser.user) {
      return json({ error: createError?.message || "Failed to create student account" }, 400);
    }

    newUserId = newUser.user.id;

    const rollbackUser = async () => {
      if (newUserId) {
        await adminClient.auth.admin.deleteUser(newUserId);
      }
    };

    const { error: roleError } = await adminClient
      .from("user_roles")
      .upsert({ user_id: newUserId, role: "student" }, { onConflict: "user_id,role" });

    if (roleError) {
      await rollbackUser();
      throw roleError;
    }

    const { error: profileError } = await adminClient
      .from("profiles")
      .upsert({
        id: newUserId,
        email: dummyEmail,
        full_name: cleanFullName,
        username: normalizedUsername,
        email_verified: true,
      }, { onConflict: "id" });

    if (profileError) {
      await rollbackUser();
      throw profileError;
    }

    const { data: studentRecord, error: studentError } = await adminClient
      .from("students")
      .insert({
        user_id: newUserId,
        parent_id: parentRecord?.id || null,
        school_id: schoolRecord?.id || null,
        class_year: cleanClassYear,
        class_id: cleanClassId,
        onboarding_completed: true,
        is_premium: false,
      })
      .select("id")
      .single();

    if (studentError) {
      await rollbackUser();
      console.error("create-student-account student insert error:", studentError);
      return json({ error: "Failed to link student to parent or school" }, 500);
    }

    return json({
      success: true,
      student: {
        id: studentRecord.id,
        user_id: newUserId,
        full_name: cleanFullName,
        class_year: cleanClassYear,
        username: normalizedUsername,
        class_id: cleanClassId,
      },
    });
  } catch (error) {
    console.error("create-student-account error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
