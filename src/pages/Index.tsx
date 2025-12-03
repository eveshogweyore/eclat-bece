import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Hero } from "@/components/Hero";
import { Features } from "@/components/Features";
import { Leaderboard } from "@/components/Leaderboard";
import { About } from "@/components/About";
import { Pricing } from "@/components/Pricing";
import { Footer } from "@/components/Footer";
import { RoleSelectionDialog } from "@/components/RoleSelectionDialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

const Index = () => {
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkAuthAndRedirect();
  }, []);

  const checkAuthAndRedirect = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.user) {
        // User is authenticated, check their role and redirect
        let { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", session.user.id)
          .maybeSingle();

        // If no role exists, check for pending role from Google OAuth
        if (!roleData) {
          const pendingRole = localStorage.getItem('pendingRole') as "student" | "parent" | "school" | null;
          if (pendingRole && (pendingRole === "student" || pendingRole === "parent" || pendingRole === "school")) {
            // Create role record
            await supabase
              .from("user_roles")
              .insert([{ user_id: session.user.id, role: pendingRole }]);

            // Create role-specific record
            if (pendingRole === "student") {
              await supabase
                .from("students")
                .insert([{ user_id: session.user.id }]);
            } else if (pendingRole === "parent") {
              await supabase
                .from("parents")
                .insert([{ user_id: session.user.id }]);
            } else if (pendingRole === "school") {
              await supabase
                .from("schools")
                .insert([{ user_id: session.user.id, school_name: "" }]);
            }

            // Clear pending role and refetch
            localStorage.removeItem('pendingRole');
            roleData = { role: pendingRole };
          }
        }

        if (roleData?.role === "student") {
          // Check if student completed onboarding
          const { data: studentData } = await supabase
            .from("students")
            .select("onboarding_completed")
            .eq("user_id", session.user.id)
            .maybeSingle();

          if (studentData && !studentData.onboarding_completed) {
            navigate("/onboarding/student");
          } else {
            navigate("/dashboard/student");
          }
        } else if (roleData?.role === "parent") {
          navigate("/dashboard/parent");
        } else if (roleData?.role === "school") {
          navigate("/dashboard/school");
        } else if (roleData?.role === "admin") {
          navigate("/admin");
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const handleAuthAction = () => {
    navigate("/role-selection");
  };

  const scrollToLeaderboard = () => {
    const element = document.getElementById("leaderboard");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation onLoginClick={handleAuthAction} onGetStartedClick={handleAuthAction} />
      <Hero onGetStartedClick={handleAuthAction} onViewLeaderboardClick={scrollToLeaderboard} />
      <Features />
      <Leaderboard onViewFullLeaderboard={scrollToLeaderboard} />
      <About />
      <Pricing onGetStartedClick={handleAuthAction} />
      <Footer />
    </div>
  );
};

export default Index;
