import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    try {
        const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
        const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
        const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

        // Check if the request is authenticated
        const authHeader = req.headers.get("Authorization");
        if (!authHeader) {
            return new Response(JSON.stringify({ error: "Unauthorized" }), {
                status: 401,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }
        const token = authHeader.replace("Bearer ", "");

        const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        const { data: { user: requestingUser }, error: userError } = await userClient.auth.getUser(token);

        if (userError || !requestingUser) {
            return new Response(JSON.stringify({ error: "Invalid token" }), {
                status: 401,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        const { studentId, action, fullName, password } = await req.json();

        if (!studentId || !action) {
            return new Response(JSON.stringify({ error: "Missing studentId or action" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

        // 1. Verify the requesting user is the parent of the student
        const { data: studentRecord, error: studentError } = await adminClient
            .from("students")
            .select("id, user_id, parent_id")
            .eq("id", studentId)
            .single();

        if (studentError || !studentRecord) {
            return new Response(JSON.stringify({ error: "Student not found" }), {
                status: 404,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        const { data: parentRecord, error: parentError } = await adminClient
            .from("parents")
            .select("id")
            .eq("user_id", requestingUser.id)
            .single();

        if (parentError || !parentRecord || parentRecord.id !== studentRecord.parent_id) {
            return new Response(JSON.stringify({ error: "Access denied: You are not this student's parent" }), {
                status: 403,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

        const studentUserId = studentRecord.user_id;

        // 2. Perform actions
        if (action === "edit-name") {
            if (!fullName) {
                return new Response(JSON.stringify({ error: "Full name is required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            // Update Profile
            const { error: profileError } = await adminClient
                .from("profiles")
                .update({ full_name: fullName })
                .eq("id", studentUserId);

            if (profileError) {
                throw profileError;
            }

            // Update Auth Metadata
            const { error: authError } = await adminClient.auth.admin.updateUserById(
                studentUserId,
                { user_metadata: { full_name: fullName } }
            );

            if (authError) {
                console.error("Warning: Failed to update auth metadata:", authError);
            }

            return new Response(JSON.stringify({ success: true, message: "Name updated successfully" }), {
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });

        } else if (action === "change-password") {
            if (!password) {
                return new Response(JSON.stringify({ error: "Password is required" }), {
                    status: 400,
                    headers: { "Content-Type": "application/json", ...corsHeaders },
                });
            }

            const { error: authError } = await adminClient.auth.admin.updateUserById(
                studentUserId,
                { password: password }
            );

            if (authError) {
                throw authError;
            }

            return new Response(JSON.stringify({ success: true, message: "Password updated successfully" }), {
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });

        } else {
            return new Response(JSON.stringify({ error: "Invalid action" }), {
                status: 400,
                headers: { "Content-Type": "application/json", ...corsHeaders },
            });
        }

    } catch (error: any) {
        console.error("Edge function error:", error);
        return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
            status: 500,
            headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
});
