import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@4.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

// Validate request body
const requestSchema = z.object({
  code: z.string().length(6).regex(/^[A-Z0-9]+$/, "Code must be 6 characters, A-Z and 0-9"),
});

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const { code } = parsed.data;

    // Use service role to securely validate the code and resolve the recipient email
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find matching, unexpired, unverified code
    const { data: codeRow, error: codeErr } = await supabase
      .from("email_verification_codes")
      .select("id, user_id, expires_at, verified")
      .eq("code", code)
      .eq("verified", false)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (codeErr || !codeRow) {
      console.error("Invalid or expired code", codeErr);
      return new Response(JSON.stringify({ error: "Invalid or expired code" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch the user's email from profiles
    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", codeRow.user_id)
      .maybeSingle();

    if (profileErr || !profile?.email) {
      console.error("Profile not found for user", profileErr);
      return new Response(JSON.stringify({ error: "Profile not found" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const toEmail = profile.email;

    // Send the email via Resend
    const emailResponse = await resend.emails.send({
      from: "Éclat <onboarding@resend.dev>",
      to: [toEmail],
      subject: "Your Éclat verification code",
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

    console.log("Verification email sent", emailResponse);

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
