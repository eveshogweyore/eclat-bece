import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminUserRequest {
    token: string
    password: string
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        // Create Supabase client with service role (for user creation)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        // Create regular client for invitation lookup
        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        )

        const { token, password } = await req.json() as CreateAdminUserRequest

        // 1. Validate invitation
        const { data: invitation, error: invitationError } = await supabaseClient
            .from('admin_invitations')
            .select('*')
            .eq('token', token)
            .eq('status', 'pending')
            .single()

        if (invitationError || !invitation) {
            throw new Error('Invalid or expired invitation')
        }

        // Check expiration
        if (new Date(invitation.expires_at) < new Date()) {
            throw new Error('Invitation has expired')
        }

        // 2. Check if email already exists
        const { data: existingUser } = await supabaseAdmin.auth.admin.listUsers()
        const emailExists = existingUser.users.some(u => u.email === invitation.target_email)

        if (emailExists) {
            throw new Error('Email already registered')
        }

        // 3. Create auth user
        const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: invitation.target_email,
            password: password,
            email_confirm: true, // Auto-confirm email for admin users
            user_metadata: {
                full_name: invitation.full_name,
                role: 'admin'
            }
        })

        if (userError || !newUser.user) {
            throw new Error(`Failed to create user: ${userError?.message}`)
        }

        // 4. Create profile
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .insert({
                id: newUser.user.id,
                email: invitation.target_email,
                full_name: invitation.full_name,
                role: 'admin'
            })

        if (profileError) {
            // Rollback user creation if profile fails
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            throw new Error(`Failed to create profile: ${profileError.message}`)
        }

        // 5. Add admin role
        const { error: roleError } = await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: newUser.user.id,
                role: 'admin'
            })

        if (roleError) {
            console.error('Error adding admin role:', roleError)
            // Continue anyway, role can be added manually if needed
        }

        // 6. Create admin record
        const { data: adminRecord, error: adminError } = await supabaseAdmin
            .from('admins')
            .insert({
                user_id: newUser.user.id,
                full_name: invitation.full_name,
                is_super_admin: invitation.is_super_admin,
                created_by: invitation.invited_by,
                is_active: true
            })
            .select()
            .single()

        if (adminError) {
            // Rollback if admin record creation fails
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            throw new Error(`Failed to create admin record: ${adminError.message}`)
        }

        // 7. Mark invitation as accepted
        const { error: updateError } = await supabaseAdmin
            .from('admin_invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('id', invitation.id)

        if (updateError) {
            console.error('Error updating invitation status:', updateError)
        }

        // 8. Log the action
        try {
            await supabaseAdmin.rpc('log_admin_action', {
                _admin_id: invitation.invited_by,
                _action: 'admin_created_from_invitation',
                _resource_type: 'admin',
                _resource_id: adminRecord.id,
                _details: {
                    invitation_id: invitation.id,
                    new_admin_email: invitation.target_email,
                    is_super_admin: invitation.is_super_admin
                }
            })
        } catch (logError) {
            console.error('Error logging action:', logError)
            // Don't fail the request if logging fails
        }

        return new Response(
            JSON.stringify({
                success: true,
                user_id: newUser.user.id,
                admin_id: adminRecord.id
            }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 200,
            },
        )
    } catch (error) {
        console.error('Error creating admin user:', error)
        return new Response(
            JSON.stringify({ success: false, error: error.message }),
            {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
                status: 400,
            },
        )
    }
})
