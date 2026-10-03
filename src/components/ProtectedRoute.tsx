import { useEffect, useRef, useState } from "react";
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

  // useNavigate returns a new identity on every location change in React
  // Router v6; depending on it would re-run the auth check (and the
  // full-screen gate) on every navigation. Navigate targets here are all
  // absolute paths, so a ref keeps the persistent listener correct.
  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  useEffect(() => {
    checkAuthStatus();

    // IMPORTANT: Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          setIsAuthorized(false);
          setIsChecking(false);
          const pathname = window.location.pathname;
          if (pathname.includes("/parent")) {
            navigateRef.current("/parent-login");
          } else if (pathname.includes("/school")) {
            navigateRef.current("/school-login");
          } else if (pathname.includes("/admin")) {
            navigateRef.current("/admin/login");
          } else {
            navigateRef.current("/student-login");
          }
        }
      }
    );

    return () => subscription?.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requiredRole]);

  const checkAuthStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session?.user) {
        const pathname = window.location.pathname;
        if (pathname.includes("/parent")) {
          navigateRef.current("/parent-login");
        } else if (pathname.includes("/school")) {
          navigateRef.current("/school-login");
        } else if (pathname.includes("/admin")) {
          navigateRef.current("/admin/login");
        } else {
          navigateRef.current("/student-login");
        }
        setIsAuthorized(false);
        return;
      }

      // Email verification is enforced app-side via the Resend code flow: the
      // profile flag starts false at signup and is flipped by verify-email-code,
      // the OAuth callback, or the provisioning functions. The auth-level
      // email_confirmed_at can no longer gate this — with the built-in
      // confirmation email disabled it is set at signup.
      const { data: profileData } = await supabase
        .from("profiles")
        .select("email_verified")
        .eq("id", session.user.id)
        .maybeSingle();

      if (profileData?.email_verified === false) {
        const verifyParams = new URLSearchParams({
          email: session.user.email || '',
          user_id: session.user.id,
          ...(requiredRole ? { role: requiredRole } : {}),
        });
        navigateRef.current(`/verify-email?${verifyParams.toString()}`);
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
              body: { role: requiredRole },
            });
          }

          // Re-check actual role after provisioning
          const { data: userRole } = await supabase
            .from("user_roles")
            .select("role")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (!userRole) {
            navigateRef.current("/auth/login/role-selection");
            return;
          }

          // If they have a role but it's not the required one, route to their dashboard
          if (userRole.role !== requiredRole) {
            if (userRole.role === "student") navigateRef.current("/dashboard/student");
            else if (userRole.role === "parent") navigateRef.current("/dashboard/parent");
            else if (userRole.role === "school") navigateRef.current("/dashboard/school");
            else if (userRole.role === "admin") navigateRef.current("/admin");
            else navigateRef.current("/auth/login/role-selection");
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
            navigateRef.current("/student-login");
            return;
          }
        }
      }

      setIsAuthorized(true);
    } catch (error) {
      console.error("Auth check error:", error);
      const pathname = window.location.pathname;
      if (pathname.includes("/parent")) {
        navigateRef.current("/parent-login");
      } else if (pathname.includes("/school")) {
        navigateRef.current("/school-login");
      } else if (pathname.includes("/admin")) {
        navigateRef.current("/admin/login");
      } else {
        navigateRef.current("/student-login");
      }
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
