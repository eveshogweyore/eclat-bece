import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { LogOut } from "lucide-react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { TeacherSidebar } from "@/components/teacher/TeacherSidebar";
import { Button } from "@/components/ui/button";
import { ContentLoader } from "@/components/PageLoader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

/**
 * Persistent teacher portal shell — mounted once as the /dashboard/teacher
 * layout route element. Child pages render through the Outlet inside a local
 * Suspense boundary so lazy page chunks never blank the sidebar or header.
 */
export default function TeacherLayout() {
  const { signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("full_name, display_name, email")
        .eq("id", user.id)
        .maybeSingle();
      if (data) setDisplayName(data.full_name || data.display_name || data.email || "Teacher");
    };
    load();
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background text-foreground dashboard-theme">
        <TeacherSidebar />

        <div className="flex-1 flex flex-col min-w-0">
          <header className="border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50">
            <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <SidebarTrigger className="md:hidden flex-shrink-0" />
                <span className="text-sm font-bold text-foreground truncate">
                  {displayName || "Teacher Portal"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut("/teacher-login")}
                  className="gap-1.5 text-muted-foreground hover:text-destructive"
                >
                  <LogOut className="h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 overflow-auto">
            <div className="mx-auto w-full max-w-6xl p-4 sm:p-6">
              <Suspense fallback={<ContentLoader />}>
                <Outlet />
              </Suspense>
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
