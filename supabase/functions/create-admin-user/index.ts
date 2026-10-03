import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateAdminUserRequest {
    token?: string
    password?: string
    directCreation?: boolean
    email?: string
    fullName?: string
    isSuperAdmin?: boolean
    permissions?: Record<string, boolean>
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
    }

    try {
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
        )

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        )

        const payload = await req.json() as CreateAdminUserRequest

        // -------------------------------------------------------------
        // Branch A: Direct Provisioning by authenticated Super Admin
        // -------------------------------------------------------------
        if (payload.directCreation) {
            const authHeader = req.headers.get('Authorization')
            if (!authHeader) {
                throw new Error('Authentication required for direct provisioning')
            }

            const clientWithAuth = createClient(
                Deno.env.get('SUPABASE_URL') ?? '',
                Deno.env.get('SUPABASE_ANON_KEY') ?? '',
                { global: { headers: { Authorization: authHeader } } }
            )

            const { data: { user: callerUser }, error: callerError } = await clientWithAuth.auth.getUser()
            if (callerError || !callerUser) {
                throw new Error('Unauthorized caller')
            }

            // Verify caller is an active super admin
            const { data: isSuper, error: superError } = await clientWithAuth
                .rpc('is_super_admin', { _user_id: callerUser.id })

            if (superError || !isSuper) {
                throw new Error('Only active super administrators can directly create admin users')
            }

            if (!payload.email || !payload.password || !payload.fullName) {
                throw new Error('Email, password, and full name are required')
            }

            // Create Auth user directly - unique constraint enforced natively by auth engine
            const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
                email: payload.email,
                password: payload.password,
                email_confirm: true,
                user_metadata: {
                    full_name: payload.fullName,
                    role: 'admin'
                }
            })

            if (userError || !newUser.user) {
                if (userError?.message?.toLowerCase().includes('already') || userError?.message?.toLowerCase().includes('exists')) {
                    throw new Error('This email is already registered in the system')
                }
                throw new Error(`Failed to create auth user: ${userError?.message}`)
            }

            // Upsert Profile (admins are provisioned confirmed; they have no
            // email verification flow)
            await supabaseAdmin.from('profiles').upsert({
                id: newUser.user.id,
                email: payload.email,
                full_name: payload.fullName,
                email_verified: true
            }, { onConflict: 'id' })

            // Add admin role
            await supabaseAdmin.from('user_roles').insert({
                user_id: newUser.user.id,
                role: 'admin'
            })

            // Get caller's admin id
            const { data: callerAdminId } = await clientWithAuth.rpc('get_admin_id', { _user_id: callerUser.id })

            const finalPermissions = payload.permissions || (
                payload.isSuperAdmin 
                    ? { canManageUsers: true, canViewAnalytics: true, canManageQuestions: true, canManageCompetitions: true }
                    : { canManageUsers: false, canViewAnalytics: true, canManageQuestions: true, canManageCompetitions: true }
            )

            // Insert into admins
            const { data: adminRecord, error: adminError } = await supabaseAdmin
                .from('admins')
                .insert({
                    user_id: newUser.user.id,
                    full_name: payload.fullName,
                    is_super_admin: payload.isSuperAdmin || false,
                    permissions: finalPermissions,
                    created_by: callerAdminId || null,
                    is_active: true
                })
                .select()
                .single()

            if (adminError) {
                await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
                throw new Error(`Failed to create admin record: ${adminError.message}`)
            }

            // Log action
            await supabaseAdmin.rpc('log_admin_action', {
                _admin_id: callerAdminId || null,
                _action: 'direct_admin_created',
                _resource_type: 'admin',
                _resource_id: adminRecord.id,
                _details: {
                    admin_email: payload.email,
                    is_super_admin: payload.isSuperAdmin
                }
            })

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
        }

        // -------------------------------------------------------------
        // Branch B: Invitation Token Setup Flow
        // -------------------------------------------------------------
        const { token, password } = payload

        if (!token || !password) {
            throw new Error('Token and password are required')
        }

        console.log('Step 1: Validating invitation with token:', token.substring(0, 10) + '...')

        // 1. Validate invitation using RPC
        const { data: invitationResult, error: invitationError } = await supabaseClient
            .rpc('get_invitation_details', { _token: token })

        if (invitationError) {
            console.error('Step 1 failed - RPC error:', invitationError)
            throw new Error(`Failed to fetch invitation: ${invitationError.message}`)
        }

        const result = invitationResult as any
        if (!result.success || !result.invitation) {
            console.error('Step 1 failed - Invalid result:', result)
            throw new Error(result.error || 'Invalid or expired invitation')
        }

        const invitation = result.invitation
        console.log('Step 2: Checking if email exists:', invitation.target_email)

        // 2. Create auth user directly - unique constraint enforced natively by auth engine
        console.log('Step 2: Creating auth user...')
        const { data: newUser, error: userError } = await supabaseAdmin.auth.admin.createUser({
            email: invitation.target_email,
            password: password,
            email_confirm: true,
            user_metadata: {
                full_name: invitation.full_name,
                role: 'admin'
            }
        })

        if (userError || !newUser.user) {
            if (userError?.message?.toLowerCase().includes('already') || userError?.message?.toLowerCase().includes('exists')) {
                throw new Error('This email is already registered in the system')
            }
            throw new Error(`Failed to create user: ${userError?.message}`)
        }

        console.log('Step 4: Creating/updating profile...')

        // 4. Create or update profile (admins are provisioned confirmed)
        const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert({
                id: newUser.user.id,
                email: invitation.target_email,
                full_name: invitation.full_name,
                email_verified: true
            }, {
                onConflict: 'id'
            })

        if (profileError) {
            console.error('Step 4 failed - Profile error:', profileError)
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            throw new Error(`Failed to create profile: ${profileError.message}`)
        }

        console.log('Step 5: Adding admin role...')

        // 5. Add admin role
        await supabaseAdmin
            .from('user_roles')
            .insert({
                user_id: newUser.user.id,
                role: 'admin'
            })

        const finalPermissions = invitation.permissions || (
            invitation.is_super_admin 
                ? { canManageUsers: true, canViewAnalytics: true, canManageQuestions: true, canManageCompetitions: true }
                : { canManageUsers: false, canViewAnalytics: true, canManageQuestions: true, canManageCompetitions: true }
        )

        // 6. Create admin record with granular permissions
        const { data: adminRecord, error: adminError } = await supabaseAdmin
            .from('admins')
            .insert({
                user_id: newUser.user.id,
                full_name: invitation.full_name,
                is_super_admin: invitation.is_super_admin,
                permissions: finalPermissions,
                created_by: invitation.invited_by,
                is_active: true
            })
            .select()
            .single()

        if (adminError) {
            await supabaseAdmin.auth.admin.deleteUser(newUser.user.id)
            throw new Error(`Failed to create admin record: ${adminError.message}`)
        }

        // 7. Mark invitation as accepted
        await supabaseAdmin
            .from('admin_invitations')
            .update({
                status: 'accepted',
                accepted_at: new Date().toISOString()
            })
            .eq('token', token)

        // 8. Log the action
        try {
            await supabaseAdmin.rpc('log_admin_action', {
                _admin_id: invitation.invited_by,
                _action: 'admin_created_from_invitation',
                _resource_type: 'admin',
                _resource_id: adminRecord.id,
                _details: {
                    invitation_token: token,
                    new_admin_email: invitation.target_email,
                    is_super_admin: invitation.is_super_admin
                }
            })
        } catch (logError) {
            console.error('Error logging action:', logError)
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
