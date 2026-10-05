import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const usernamePattern = /^[a-z0-9._-]{2,20}$/;

const json = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });

const addOneYear = (date: Date) => {
  const copy = new Date(date);
  copy.setFullYear(copy.getFullYear() + 1);
  return copy;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    const { studentId, action, fullName, password, username, classYear, classId } = await req.json();

    if (!studentId || !action) {
      return json({ error: "Missing studentId or action" }, 400);
    }

    const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

    // Caller is authorized as: the student's parent, OR the school that owns
    // the student (schools.user_id = caller).
    const { data: parentRecord, error: parentError } = await adminClient
      .from("parents")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    const { data: schoolRecord, error: schoolError } = await adminClient
      .from("schools")
      .select("id")
      .eq("user_id", userData.user.id)
      .maybeSingle();

    if (!parentRecord && !schoolRecord) {
      return json({ error: "Only parents or schools can manage student accounts" }, 403);
    }

    const { data: studentRecord, error: studentError } = await adminClient
      .from("students")
      .select("id, user_id, parent_id, school_id, is_premium")
      .eq("id", studentId)
      .single();

    if (studentError || !studentRecord) {
      return json({ error: "Student not found" }, 404);
    }

    const isParentCaller = !!parentRecord && studentRecord.parent_id === parentRecord.id;
    const isSchoolCaller = !!schoolRecord && studentRecord.school_id === schoolRecord.id;

    if (!isParentCaller && !isSchoolCaller) {
      return json({ error: "Access denied: This student is not linked to your account" }, 403);
    }

    const studentUserId = studentRecord.user_id;

    if (action === "edit-name") {
      const cleanFullName = typeof fullName === "string" ? fullName.trim() : "";
      if (cleanFullName.length < 2 || cleanFullName.length > 100) {
        return json({ error: "Full name must be between 2 and 100 characters" }, 400);
      }

      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ full_name: cleanFullName })
        .eq("id", studentUserId);

      if (profileError) throw profileError;

      const { error: authError } = await adminClient.auth.admin.updateUserById(
        studentUserId,
        { user_metadata: { full_name: cleanFullName, role: "student", provisioned_by: isSchoolCaller ? "school" : "parent" } },
      );

      if (authError) {
        console.error("manage-student-account auth metadata warning:", authError);
      }

      return json({ success: true, message: "Name updated successfully" });
    }

    if (action === "change-password") {
      const cleanPassword = typeof password === "string" ? password : "";
      if (cleanPassword.length < 6 || cleanPassword.length > 100) {
        return json({ error: "Password must be between 6 and 100 characters" }, 400);
      }

      const { error: authError } = await adminClient.auth.admin.updateUserById(
        studentUserId,
        { password: cleanPassword },
      );

      if (authError) throw authError;

      return json({ success: true, message: "Password updated successfully" });
    }

    if (action === "set-class") {
      // Schools only: place the student into a class arm of their own school.
      if (!isSchoolCaller) {
        return json({ error: "Only schools can change a student's class placement" }, 403);
      }
      const cleanClassYear = typeof classYear === "string" ? classYear.trim() : "";
      const cleanClassId = typeof classId === "string" && classId.trim() ? classId.trim() : null;
      if (!["year_6", "year_9"].includes(cleanClassYear)) {
        return json({ error: "Invalid cohort" }, 400);
      }
      if (cleanClassId) {
        const { data: classRow, error: classErr } = await adminClient
          .from("school_classes")
          .select("id")
          .eq("id", cleanClassId)
          .eq("school_id", schoolRecord.id)
          .maybeSingle();
        if (classErr) throw classErr;
        if (!classRow) {
          return json({ error: "Class not found in your school" }, 400);
        }
      }
      const { error: updateErr } = await adminClient
        .from("students")
        .update({ class_year: cleanClassYear, class_id: cleanClassId })
        .eq("id", studentRecord.id);
      if (updateErr) throw updateErr;
      return json({ success: true, message: "Class placement updated" });
    }

    if (action === "edit-username") {
      const normalizedUsername = typeof username === "string" ? username.trim().toLowerCase() : "";
      if (!usernamePattern.test(normalizedUsername)) {
        return json({
          error: "Username must be 2-20 characters and may only contain letters, numbers, dots, underscores, or hyphens",
        }, 400);
      }

      const newEmail = `${normalizedUsername}@student.eclat.com`;

      const { data: existingProfile, error: checkError } = await adminClient
        .from("profiles")
        .select("id")
        .eq("username", normalizedUsername)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingProfile && existingProfile.id !== studentUserId) {
        return json({ error: "Username is already taken" }, 409);
      }

      const { error: authError } = await adminClient.auth.admin.updateUserById(
        studentUserId,
        { email: newEmail, email_confirm: true },
      );

      if (authError) {
        if (authError.message.toLowerCase().includes("email")) {
          return json({ error: "This username is already associated with another account" }, 409);
        }
        throw authError;
      }

      const { error: profileError } = await adminClient
        .from("profiles")
        .update({ username: normalizedUsername, email: newEmail })
        .eq("id", studentUserId);

      if (profileError) throw profileError;

      return json({ success: true, message: "Username updated successfully" });
    }

    if (action === "upgrade-premium") {
      const now = new Date();

      const { data: existingSubscription, error: existingError } = await adminClient
        .from("subscriptions")
        .select("id, expires_at")
        .eq("student_id", studentRecord.id)
        .eq("status", "active")
        .maybeSingle();

      if (existingError) throw existingError;

      const existingExpiry = existingSubscription?.expires_at
        ? new Date(existingSubscription.expires_at)
        : null;
      const startsFrom = existingExpiry && existingExpiry > now ? existingExpiry : now;
      const expiresAt = addOneYear(startsFrom).toISOString();

      if (existingSubscription) {
        const { error: updateSubscriptionError } = await adminClient
          .from("subscriptions")
          .update({
            plan: "premium_annual",
            status: "active",
            amount: 15000,
            currency: "NGN",
            expires_at: expiresAt,
            metadata: {
              source: "dummy_payment",
              processed_by_user_id: userData.user.id,
            },
          })
          .eq("id", existingSubscription.id);

        if (updateSubscriptionError) throw updateSubscriptionError;
      } else {
        const { error: insertSubscriptionError } = await adminClient
          .from("subscriptions")
          .insert({
            parent_id: parentRecord?.id ?? null,
            student_id: studentRecord.id,
            plan: "premium_annual",
            status: "active",
            amount: 15000,
            currency: "NGN",
            started_at: now.toISOString(),
            expires_at: expiresAt,
            metadata: {
              source: "dummy_payment",
              processed_by_user_id: userData.user.id,
            },
          });

        if (insertSubscriptionError) throw insertSubscriptionError;
      }

      const { error: studentUpdateError } = await adminClient
        .from("students")
        .update({ is_premium: true })
        .eq("id", studentRecord.id);

      if (studentUpdateError) throw studentUpdateError;

      return json({
        success: true,
        message: "Premium access activated",
        expires_at: expiresAt,
      });
    }

    return json({ error: "Invalid action" }, 400);
  } catch (error) {
    console.error("manage-student-account error:", error);
    return json({ error: error instanceof Error ? error.message : "Internal server error" }, 500);
  }
});
