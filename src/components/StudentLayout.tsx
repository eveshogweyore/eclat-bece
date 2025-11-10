import { ReactNode, useEffect, useState } from "react";
import { Flame, LogOut, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

interface StudentLayoutProps {
  children: ReactNode;
}

export function StudentLayout({ children }: StudentLayoutProps) {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    const fetchStreak = async () => {
      if (!user) return;

      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!studentData?.id) return;

      const { data: streakData } = await supabase
        .from("student_streaks")
        .select("current_streak")
        .eq("student_id", studentData.id)
        .maybeSingle();

      if (streakData) {
        setCurrentStreak(streakData.current_streak);
      }
    };

    fetchStreak();
  }, [user]);

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-border/30 bg-gradient-to-r from-background via-background/98 to-background backdrop-blur-xl sticky top-0 z-50 shadow-[0_4px_24px_rgba(0,0,0,0.08)] dark:shadow-[0_4px_24px_rgba(0,0,0,0.2)]">
            <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-6 overflow-x-auto">
                <SidebarTrigger className="md:hidden hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                <img 
                  src={logo} 
                  alt="Éclat Logo" 
                  className="h-8 sm:h-10 md:h-12 w-auto cursor-pointer hover:scale-110 transition-all duration-300 filter drop-shadow-lg hover:drop-shadow-2xl flex-shrink-0" 
                  onClick={() => navigate("/")} 
                />
                <div className={`flex items-center gap-1.5 sm:gap-2 md:gap-2.5 px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full shadow-lg backdrop-blur-sm border transition-all duration-300 hover:scale-105 flex-shrink-0 ${
                  currentStreak === 0 
                    ? 'bg-destructive/20 border-destructive/30' 
                    : currentStreak >= 7 
                    ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 border-green-500/40' 
                    : 'bg-gradient-to-r from-accent/20 to-primary/20 border-accent/30'
                }`}>
                  <Flame 
                    className={`transition-all duration-300 flex-shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] ${
                      currentStreak === 0 
                        ? 'text-destructive' 
                        : currentStreak >= 7 
                        ? 'text-green-600 drop-shadow-[0_0_8px_rgba(34,197,94,0.5)]' 
                        : 'text-accent drop-shadow-[0_0_8px_rgba(var(--accent),0.5)]'
                    }`} 
                  />
                  <span className={`text-xs sm:text-sm md:text-[15px] font-bold tracking-tight whitespace-nowrap ${
                    currentStreak === 0 
                      ? 'text-destructive' 
                      : currentStreak >= 7 
                      ? 'text-green-600' 
                      : 'text-accent'
                  }`}>{currentStreak}-day streak!</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <ThemeToggle />
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="hover:scale-110 hover:bg-accent/20 transition-all duration-300 h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-xl flex-shrink-0"
                >
                  <Settings className="w-[18px] h-[18px] sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
                </Button>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={signOut}
                  className="hover:scale-110 hover:bg-destructive/20 hover:text-destructive transition-all duration-300 h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-xl flex-shrink-0"
                >
                  <LogOut className="w-[18px] h-[18px] sm:w-5 sm:h-5 md:w-[22px] md:h-[22px]" />
                </Button>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
