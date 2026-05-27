import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * ProtectedRoute Component - Client-Side Route Protection
 * 
 * SECURITY NOTE: This component provides UI-level route protection only.
 * It checks user authentication and roles on the client side to control
 * which pages users can access in the interface.
 * 
 * LIMITATIONS:
 * - Client-side checks can be bypassed by determined attackers
 * - This does NOT protect your data or API endpoints
 * - All data security MUST be enforced server-side through:
 *   1. Row Level Security (RLS) policies on database tables
 *   2. Server-side role validation in Edge Functions
 *   3. Proper use of the has_role() security definer function
 * 
 * WHEN TO ADD SERVER-SIDE VALIDATION:
 * - When creating Edge Functions that perform sensitive operations
 * - When implementing admin-only features or data modifications
 * - When building APIs that expose privileged information
 * 
 * Example server-side validation in Edge Functions:
 * ```typescript
 * const { data: hasRole } = await supabase.rpc('has_role', {
 *   _user_id: user.id,
 *   _role: 'school'
 * });
 * if (!hasRole) {
 *   return new Response('Forbidden', { status: 403 });
 * }
 * ```
 * 
 * The existing RLS policies and has_role() function provide strong
 * server-side security. This component adds a user-friendly layer
 * on top to prevent UI confusion and unauthorized navigation attempts.
 */

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: "student" | "parent" | "school" | "admin";
}

export const ProtectedRoute = ({ children, requiredRole }: ProtectedRouteProps) => {
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isChecking, setIsChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthStatus();

    // IMPORTANT: Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsAuthorized(false);
          setIsChecking(false);
          navigate('/auth');
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, [navigate]);

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        navigate("/auth");
        setIsAuthorized(false);
        return;
      }

      // Check if email is verified
      if (!session.user.email_confirmed_at) {
        navigate("/verify-email");
        return;
      }

      // If a specific role is required, check it
      if (requiredRole) {
        // Check if user has the required role
        let { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .eq("role", requiredRole)
          .maybeSingle();

        if (!roleData) {
          // Try to provision user roles/records (idempotent)
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          if (currentSession?.access_token) {
            await supabase.functions.invoke("provision-user", {
              headers: { Authorization: `Bearer ${currentSession.access_token}` },
            });
          }

          // Re-check actual role after provisioning
          const { data: userRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!userRole) {
            navigate("/role-selection");
            return;
          }

          // If they have a role but it's not the required one, route to their dashboard
          if (userRole.role !== requiredRole) {
            if (userRole.role === "student") navigate("/dashboard/student");
            else if (userRole.role === "parent") navigate("/dashboard/parent");
            else if (userRole.role === "school") navigate("/dashboard/school");
            else if (userRole.role === "admin") navigate("/admin");
            else navigate("/role-selection");
            return;
          }

          // Role now matches required
          roleData = userRole;
        }

        // Students are provisioned by parents, so they should already have a student record.
        if (requiredRole === "student") {
          const { data: studentData } = await supabase
            .from("students")
            .select("id")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!studentData) {
            navigate("/auth?role=student");
            return;
          }
        }
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Auth check error:", error);
      navigate("/auth");
    } finally {
      setIsChecking(false);
    }
  };

  if (isChecking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return isAuthorized ? <>{children}</> : null;
};
