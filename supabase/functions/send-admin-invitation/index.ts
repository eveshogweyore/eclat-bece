import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitationEmailRequest {
  invitationId: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Get the invitation ID from the request
    const { invitationId } = await req.json() as InvitationEmailRequest

    // Fetch invitation details
    const { data: invitation, error: invitationError } = await supabaseClient
      .from('admin_invitations')
      .select(`
        id,
        token,
        full_name,
        is_super_admin,
        expires_at,
        target_email,
        invited_by
      `)
      .eq('id', invitationId)
      .single()

    if (invitationError) throw invitationError

    // Get inviter's name
    const { data: inviter, error: inviterError } = await supabaseClient
      .from('admins')
      .select('full_name')
      .eq('id', invitation.invited_by)
      .single()

    if (inviterError) throw inviterError

    // Generate invitation link
    const siteUrl = Deno.env.get('PUBLIC_SITE_URL') ?? 'https://eclat-bece.vercel.app'
    const invitationLink = `${siteUrl}/admin/setup/${invitation.token}`

    // Format expiration date
    const expiresAt = new Date(invitation.expires_at)
    const expirationDate = expiresAt.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })

    // Send email via Resend
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Éclat <noreply@bece.eclatapp.xyz>',
        to: [invitation.target_email],
        subject: 'You\'ve been invited to join Éclat Platform as an Administrator',
        html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Admin Invitation</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">🛡️ Admin Invitation</h1>
  </div>
  
  <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e5e7eb;">
    <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${invitation.full_name}</strong>,</p>
    
    <p style="font-size: 16px; margin-bottom: 20px;">
      <strong>${inviter.full_name}</strong> has invited you to become an administrator on the <strong>Éclat Platform</strong>.
    </p>
    
    <p style="font-size: 14px; margin-bottom: 20px; color: #6b7280;">
      This invitation is for creating a <strong>new admin account</strong>. Click the button below to set up your password and activate your account.
    </p>
    
    <div style="background: white; padding: 20px; border-radius: 8px; margin: 25px 0; border-left: 4px solid #667eea;">
      <p style="margin: 0 0 10px 0; font-size: 14px; color: #6b7280;"><strong>Role:</strong></p>
      <p style="margin: 0; font-size: 16px;">${invitation.is_super_admin ? '🔐 Super Administrator' : '👤 Administrator'}</p>
    </div>
    
    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
        Set Up Your Admin Account
      </a>
    </div>
    
    <div style="background: #fef3c7; border: 1px solid #fbbf24; padding: 15px; border-radius: 8px; margin: 25px 0;">
      <p style="margin: 0; font-size: 14px; color: #92400e;">
        <strong>⏰ Important:</strong> This invitation will expire on <strong>${expirationDate}</strong>
      </p>
    </div>
    
    <p style="font-size: 14px; color: #6b7280; margin-top: 25px;">
      If the button doesn't work, copy and paste this link into your browser:
    </p>
    <p style="font-size: 12px; color: #667eea; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
      ${invitationLink}
    </p>
    
    <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
    
    <p style="font-size: 13px; color: #9ca3af; margin: 0;">
      If you did not expect this invitation, please ignore this email or contact support.
    </p>
  </div>
  
  <div style="text-align: center; margin-top: 20px; color: #9ca3af; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Éclat Platform. All rights reserved.</p>
  </div>
</body>
</html>
        `,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(`Resend API error: ${JSON.stringify(data)}`)
    }

    return new Response(
      JSON.stringify({ success: true, emailId: data.id }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
