import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const requestSchema = z.object({
  user_id: z.string().uuid(),
  code: z.string().regex(/^\d{6}$/),
});

const MAX_FAILED_ATTEMPTS = 5;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const json = await req.json().catch(() => ({}));
    const parsed = requestSchema.safeParse(json);
    if (!parsed.success) {
      return new Response(
        JSON.stringify({ error: "Invalid request", details: parsed.error.flatten() }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const { user_id, code } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // First, get the most recent unexpired code for this user to check failed attempts
    const { data: latestCode, error: latestError } = await supabase
      .from("email_verification_codes")
      .select("id, failed_attempts")
      .eq("user_id", user_id)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latestError) {
      console.error("Error checking verification codes", latestError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Check if too many failed attempts
    if (latestCode && (latestCode.failed_attempts || 0) >= MAX_FAILED_ATTEMPTS) {
      console.warn("Too many failed attempts for user", user_id);
      return new Response(
        JSON.stringify({ error: "Too many failed attempts. Please request a new code." }),
        { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Find a matching, unexpired, unverified code
    const { data: verification, error: findError } = await supabase
      .from("email_verification_codes")
      .select("id")
      .eq("user_id", user_id)
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .maybeSingle();

    if (findError) {
      console.error("Error finding verification code", findError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // If no matching code found, increment failed attempts
    if (!verification) {
      if (latestCode) {
        await supabase
          .from("email_verification_codes")
          .update({ failed_attempts: (latestCode.failed_attempts || 0) + 1 })
          .eq("id", latestCode.id);
        console.warn("Invalid code attempt, incremented failed_attempts for user", user_id);
      }
      return new Response(
        JSON.stringify({ error: "Invalid or expired code" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Mark code as verified
    const { error: updateCodeError } = await supabase
      .from("email_verification_codes")
      .update({ verified: true })
      .eq("id", verification.id);

    if (updateCodeError) {
      console.error("Failed to update code as verified", updateCodeError);
      return new Response(
        JSON.stringify({ error: "Failed to verify code" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Update profile to mark email as verified
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ email_verified: true })
      .eq("id", user_id);

    if (profileError) {
      console.error("Failed to update profile email_verified", profileError);
      return new Response(
        JSON.stringify({ error: "Failed to update profile" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Confirm email in Supabase Auth system
    const { error: confirmError } = await supabase.auth.admin.updateUserById(
      user_id,
      { email_confirm: true }
    );

    if (confirmError) {
      console.error("Failed to confirm email in auth system", confirmError);
      return new Response(
        JSON.stringify({ error: "Failed to confirm email" }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("Email verified successfully for user", user_id);
    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("verify-email-code error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
