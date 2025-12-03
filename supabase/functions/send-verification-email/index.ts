import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Validate request body
const requestSchema = z.object({
  user_id: z.string().uuid(),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Rate limit: minimum time between requests (in milliseconds)
const MIN_REQUEST_INTERVAL_MS = 60 * 1000; // 1 minute

serve(async (req) => {
  // Handle CORS preflight requests
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

    const { user_id } = parsed.data;

    // Use service role to securely access database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limiting: Check if a valid unexpired code was created recently
    const { data: existingCode, error: existingError } = await supabase
      .from("email_verification_codes")
      .select("created_at")
      .eq("user_id", user_id)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingError) {
      console.error("Error checking existing codes", existingError);
    }

    // If a code was created within the rate limit window, reject the request
    if (existingCode) {
      const createdAt = new Date(existingCode.created_at).getTime();
      const now = Date.now();
      if (now - createdAt < MIN_REQUEST_INTERVAL_MS) {
        const waitSeconds = Math.ceil((MIN_REQUEST_INTERVAL_MS - (now - createdAt)) / 1000);
        console.warn("Rate limit hit for user", user_id, "wait", waitSeconds, "seconds");
        return new Response(
          JSON.stringify({ 
            error: `Please wait ${waitSeconds} seconds before requesting a new code.`,
            retry_after: waitSeconds 
          }),
          { status: 429, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Fetch the user's email from Auth Admin (service role) to avoid relying on profiles
    const { data: userRes, error: adminErr } = await supabase.auth.admin.getUserById(user_id);

    let toEmail: string | null = null;

    if (!adminErr && userRes?.user?.email) {
      toEmail = userRes.user.email;
    } else {
      // Fallback to profiles table if available
      const { data: profile, error: profileErr } = await supabase
        .from("profiles")
        .select("email")
        .eq("id", user_id)
        .maybeSingle();

      if (profileErr) {
        console.error("Error fetching profile for user", user_id, profileErr);
      }
      toEmail = profile?.email ?? null;
    }

    if (!toEmail) {
      console.error("Email not found for user", user_id);
      return new Response(JSON.stringify({ error: "User email not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Generate a 6-digit numeric verification code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Insert the code into the database using service role
    const { error: insertError } = await supabase
      .from("email_verification_codes")
      .insert({
        user_id: user_id,
        code: code,
        expires_at: expiresAt.toISOString(),
        failed_attempts: 0,
      });

    if (insertError) {
      console.error("Failed to insert verification code", insertError);
      return new Response(JSON.stringify({ error: "Failed to create verification code" }), {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Send the email via Resend
    const emailResponse = await resend.emails.send({
      from: "Éclat <noreply@bece.eclatapp.xyz>",
      to: [toEmail],
      subject: "Your Éclat verification code",
      text: `Your Éclat verification code is ${code}. It expires in 10 minutes.`,
      html: `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <meta http-equiv="x-ua-compatible" content="ie=edge" />
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <title>Verify your email</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif; }
              .container { max-width: 600px; margin: 0 auto; padding: 32px 16px; }
              .code-box { background: #f7f7f7; border: 1px solid #e5e5e5; border-radius: 8px; padding: 24px; text-align: center; margin: 24px 0; }
              .code { font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #111827; font-family: 'SFMono-Regular', Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace; }
              .muted { color: #6b7280; font-size: 14px; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>Verify your email</h1>
              <p>Welcome to Éclat! Use the code below to verify your email address.</p>
              <div class="code-box"><div class="code">${code}</div></div>
              <p class="muted">This code expires in 10 minutes. If you didn't request this, you can safely ignore this email.</p>
            </div>
          </body>
        </html>
      `,
    });

    console.log("Verification email sent for user", user_id, emailResponse);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err) {
    console.error("send-verification-email error", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
