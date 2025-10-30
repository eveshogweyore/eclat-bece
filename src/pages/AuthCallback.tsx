import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function AuthCallback() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(true);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          console.error("Session error:", sessionError);
          toast({
            title: "Authentication Failed",
            description: "Unable to complete Google sign-in",
            variant: "destructive",
          });
          navigate("/role-selection");
          return;
        }

        const user = session.user;
        const role = localStorage.getItem('pendingRole') || 'student';
        localStorage.removeItem('pendingRole');

        // Check if user already has a role (existing user)
        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle();

        if (roleData) {
          // Existing user - check onboarding status and redirect to dashboard
          const userRole = roleData.role;

          if (userRole === "student") {
            const { data: studentData } = await supabase
              .from("students")
              .select("onboarding_completed")
              .eq("user_id", user.id)
              .maybeSingle();

            if (studentData && !studentData.onboarding_completed) {
              navigate("/onboarding/student");
              return;
            }
          }

          // Navigate to appropriate dashboard
          const dashboardPath = userRole === "parent" 
            ? "/dashboard/parent" 
            : userRole === "school" 
            ? "/dashboard/school" 
            : "/dashboard/student";

          navigate(dashboardPath);
          return;
        }

        // New user - provision with onboarding_completed = FALSE
        // Update user metadata with role
        const { error: updateError } = await supabase.auth.updateUser({
          data: { role: role }
        });

        if (updateError) {
          console.error("Error updating user metadata:", updateError);
        }

        // Provision user (creates role and base record)
        const { error: provisionError } = await supabase.functions.invoke("provision-user", {
          headers: { Authorization: `Bearer ${session.access_token}` },
        });

        if (provisionError) {
          console.error("Provision error:", provisionError);
          toast({
            title: "Setup Failed",
            description: "Unable to complete account setup",
            variant: "destructive",
          });
          navigate("/role-selection");
          return;
        }

        // Mark email as verified for Google users
        const { error: verifyError } = await supabase
          .from("profiles")
          .update({ email_verified: true })
          .eq("id", user.id);

        if (verifyError) {
          console.error("Error verifying email:", verifyError);
        }

        // Redirect to appropriate onboarding
        if (role === "student") {
          navigate("/onboarding/student");
        } else if (role === "parent") {
          navigate("/onboarding/parent");
        } else if (role === "school") {
          navigate("/onboarding/school");
        } else {
          navigate("/role-selection");
        }

      } catch (error) {
        console.error("Callback error:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
        navigate("/role-selection");
      } finally {
        setIsProcessing(false);
      }
    };

    handleCallback();
  }, [navigate, toast]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
        <p className="text-muted-foreground">Completing sign-in...</p>
      </div>
    </div>
  );
}
