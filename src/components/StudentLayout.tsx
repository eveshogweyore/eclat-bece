import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Flame, Settings, User as UserIcon, KeyRound, Link2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { StudentSidebar } from "@/components/StudentSidebar";
import { StudentProfileSettings } from "@/components/StudentProfileSettings";
import { PasswordChangeDialog } from "@/components/PasswordChangeDialog";
import { AccountSettingsDialog } from "@/components/AccountSettingsDialog";
import { ContentLoader } from "@/components/PageLoader";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { getBadgeLevel, BadgeLevel } from "@/components/WinnerBadge";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

/**
 * Persistent student portal shell — mounted once as the /dashboard/student
 * layout route element. Child pages render through the Outlet inside a local
 * Suspense boundary so lazy page chunks never blank the sidebar or header.
 */
export function StudentLayout() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { theme, resolvedTheme } = useTheme();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);
  const [accountSettingsOpen, setAccountSettingsOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [totalWins, setTotalWins] = useState(0);
  const [badgeLevel, setBadgeLevel] = useState<BadgeLevel>('bronze');

  const isDark = resolvedTheme === "dark";
  const logo = isDark ? logoLight : logoDark;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      // Fetch profile data
      const { data: profileData } = await supabase
        .from("profiles")
        .select("avatar_url, display_name, email")
        .eq("id", user.id)
        .maybeSingle();

      if (profileData) {
        setAvatarUrl(profileData.avatar_url || "");
        setDisplayName(profileData.display_name || profileData.email || "");
      }

      // Fetch student data for streak
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

      // Fetch quiz results to calculate wins (bounded — lifetime aggregates
      // only need counts, but keep the payload capped)
      const { data: quizResults } = await supabase
        .from("quiz_results")
        .select("score")
        .eq("student_id", studentData.id)
        .limit(5000);

      if (quizResults) {
        const wins = quizResults.filter(result => result.score >= 80).length;
        setTotalWins(wins);
        setBadgeLevel(getBadgeLevel(wins));
      }
    };

    fetchUserData();
  }, [user]);

  const getInitials = () => {
    if (displayName) {
      return displayName.substring(0, 2).toUpperCase();
    }
    return "ST";
  };

  return (
    <SidebarProvider>
      <div data-student-theme={isDark ? "dark" : "light"} className="min-h-screen flex w-full bg-background text-foreground dashboard-theme">
        <StudentSidebar />
        
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b border-border bg-card/95 backdrop-blur-xl sticky top-0 z-50">
            <div className="flex items-center justify-between px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-5">
              <div className="flex items-center gap-2 sm:gap-3 md:gap-6 overflow-x-auto">
                <SidebarTrigger className="md:hidden hover:scale-110 transition-transform duration-200 flex-shrink-0" />
                <div className={`flex items-center gap-1.5 sm:gap-2 md:gap-2.5 px-2 sm:px-3 md:px-5 py-1.5 sm:py-2 md:py-2.5 rounded-full shadow-sm backdrop-blur-sm border transition-all duration-300 hover:scale-105 flex-shrink-0 ${
                  currentStreak === 0 
                    ? 'bg-destructive/10 border-destructive/30 text-destructive' 
                    : currentStreak >= 7 
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600 dark:text-emerald-400' 
                    : 'bg-amber-500/10 border-amber-500/30 text-amber-600 dark:text-[#f4d21f]'
                }`}>
                  <Flame 
                    className={`transition-all duration-300 flex-shrink-0 w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-[18px] md:h-[18px] ${
                      currentStreak === 0 
                        ? 'text-destructive' 
                        : currentStreak >= 7 
                        ? 'text-emerald-600 dark:text-emerald-400' 
                        : 'text-amber-600 dark:text-[#f4d21f]'
                    }`} 
                  />
                  <span className={`text-xs sm:text-sm md:text-[15px] font-bold tracking-tight whitespace-nowrap ${
                    currentStreak === 0 
                      ? 'text-destructive' 
                      : currentStreak >= 7 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-amber-600 dark:text-[#f4d21f]'
                  }`}>{currentStreak}-day streak!</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3">
                <NotificationBell />
                <ThemeToggle />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="hover:scale-110 transition-all duration-300 h-9 w-9 sm:h-10 sm:w-10 md:h-11 md:w-11 rounded-full flex-shrink-0 p-0 relative"
                    >
                      <Avatar className="h-full w-full">
                        <AvatarImage src={avatarUrl} alt={displayName} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          <UserIcon className="h-5 w-5" />
                        </AvatarFallback>
                      </Avatar>
                      {totalWins > 0 && (
                        <div className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs border-2 ${
                          badgeLevel === 'platinum' ? 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-600' :
                          badgeLevel === 'gold' ? 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-600' :
                          badgeLevel === 'silver' ? 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-600' :
                          'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700'
                        }`}>
                          <span>{badgeLevel === 'platinum' ? '💎' : badgeLevel === 'gold' ? '🥇' : badgeLevel === 'silver' ? '🥈' : '🥉'}</span>
                        </div>
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem onClick={() => setSettingsOpen(true)}>
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Profile Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setPasswordDialogOpen(true)}>
                      <KeyRound className="mr-2 h-4 w-4" />
                      <span>Change Password</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setAccountSettingsOpen(true)}>
                      <Link2 className="mr-2 h-4 w-4" />
                      <span>Account Settings</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto">
            <Suspense fallback={<ContentLoader />}>
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      
      <StudentProfileSettings open={settingsOpen} onOpenChange={setSettingsOpen} />
      <PasswordChangeDialog open={passwordDialogOpen} onOpenChange={setPasswordDialogOpen} />
      <AccountSettingsDialog open={accountSettingsOpen} onOpenChange={setAccountSettingsOpen} />
    </SidebarProvider>
  );
}
