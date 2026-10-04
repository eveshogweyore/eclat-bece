import { Trophy, Loader2, Sparkles, Flame, Calendar, Crown, Award, Users } from "lucide-react";
import { CompetitionLeaderboards, LeaderboardStudent, CurrentUserRankInfo, CurrentUserPointInfo } from "@/components/CompetitionLeaderboards";
import { WeeklyLeagueCohortCard } from "@/components/gamification/WeeklyLeagueCohortCard";
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useLeaderboardData } from "@/hooks/useLeaderboardData";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

const EMPTY_RANKS: CurrentUserRankInfo = { weekly: 0, monthly: 0, annual: 0, math: 0, english: 0 };
const EMPTY_POINTS: CurrentUserPointInfo = { weekly: 0, monthly: 0, annual: 0, math: 0, english: 0 };

export default function StudentLeaderboardPage() {
  const { user } = useAuth();
  const [currentUserName, setCurrentUserName] = useState("Scholar");
  const [activeView, setActiveView] = useState<"cohort" | "national">("cohort");
  const [currentLevel, setCurrentLevel] = useState(1);
  const [leagueTier, setLeagueTier] = useState(1);

  // Profile + level/tier (small personal reads, cached per user)
  const profileQuery = useQuery({
    queryKey: ["leaderboard-context", user?.id],
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      // 1. Get current student's name
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name, username")
        .eq("id", user!.id)
        .single();
      setCurrentUserName(profileData?.full_name || profileData?.username || "You");

      // 2. Get student gamification profile for level/tier
      const { data: studentRecord } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user!.id)
        .maybeSingle();

      if (!studentRecord) return null;

      const { data: gamificationProfile } = await supabase
        .from("student_gamification_profile")
        .select("current_level, current_league_tier")
        .eq("student_id", studentRecord.id)
        .maybeSingle();

      if (gamificationProfile) {
        setCurrentLevel(Number(gamificationProfile.current_level || 1));
        setLeagueTier(Number(gamificationProfile.current_league_tier || 1));
      }
      return true;
    },
    retry: false,
  });

  // 3. Fetch comprehensive leaderboards (shared cached query)
  const leaderboardQuery = useLeaderboardData(user?.id);
  const leaderboardError = leaderboardQuery.error;

  useEffect(() => {
    if (leaderboardError) {
      console.error("Error loading leaderboards:", leaderboardError);
      toast.error("Failed to load competitive standings");
    }
  }, [leaderboardError]);

  const loading = profileQuery.isLoading || leaderboardQuery.isLoading;
  const data = leaderboardQuery.data;
  const weeklyLeaders: LeaderboardStudent[] = data?.weeklyLeaders ?? [];
  const monthlyLeaders: LeaderboardStudent[] = data?.monthlyLeaders ?? [];
  const annualLeaders: LeaderboardStudent[] = data?.annualLeaders ?? [];
  const mathLeaders: LeaderboardStudent[] = data?.mathLeaders ?? [];
  const englishLeaders: LeaderboardStudent[] = data?.englishLeaders ?? [];
  const schoolLeaders = data?.schoolLeaders ?? [];
  const currentUserRanks = data?.currentUserRanks ?? EMPTY_RANKS;
  const currentUserPoints = data?.currentUserPoints ?? EMPTY_POINTS;

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-sky-400" />
          <p className="text-sm font-semibold text-muted-foreground">Loading standings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-400/20 text-amber-300 border border-amber-400/30">
              <Trophy size={14} />
            </span>
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Competitive Arena
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Leaderboards & League Cohorts
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1 max-w-xl">
            Compete in your weekly 30-scholar cohort for promotion, or challenge the nation across BECE & Common Entrance
          </p>
        </div>

        {/* Level badge pill */}
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-md bg-sky-500/20 text-sm font-black text-sky-400 border border-sky-500/30">
            {currentLevel}
          </span>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Your Status</p>
            <p className="text-xs font-extrabold text-white">Level {currentLevel} Scholar</p>
          </div>
        </div>
      </div>

      {/* Snapshot Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6 animate-fade-in">
        {/* Weekly Rank */}
        <Card className="border border-border bg-card/90 rounded-xl shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Flame size={14} className="text-amber-400" /> Weekly
              </span>
              <span className="text-[11px] font-bold text-amber-300">
                {currentUserPoints.weekly?.toLocaleString() || 0} EP
              </span>
            </div>
            <div className="text-xl font-black text-white">
              {currentUserRanks.weekly && currentUserRanks.weekly > 0 ? `#${currentUserRanks.weekly}` : "Unranked"}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Resets Sunday 23:59 UTC</p>
          </CardContent>
        </Card>

        {/* Monthly Rank */}
        <Card className="border border-border bg-card/90 rounded-xl shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Calendar size={14} className="text-sky-400" /> Monthly
              </span>
              <span className="text-[11px] font-bold text-sky-300">
                {currentUserPoints.monthly?.toLocaleString() || 0} EP
              </span>
            </div>
            <div className="text-xl font-black text-white">
              {currentUserRanks.monthly && currentUserRanks.monthly > 0 ? `#${currentUserRanks.monthly}` : "Unranked"}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Monthly Diligence</p>
          </CardContent>
        </Card>

        {/* All-Time Rank */}
        <Card className="border border-border bg-card/90 rounded-xl shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Crown size={14} className="text-yellow-400" /> All-Time
              </span>
              <span className="text-[11px] font-bold text-yellow-300">
                {currentUserPoints.annual?.toLocaleString() || 0} EP
              </span>
            </div>
            <div className="text-xl font-black text-white">
              {currentUserRanks.annual && currentUserRanks.annual > 0 ? `#${currentUserRanks.annual}` : "Unranked"}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Lifetime Hall of Fame</p>
          </CardContent>
        </Card>

        {/* Subject Rank */}
        <Card className="border border-border bg-card/90 rounded-xl shadow-none">
          <CardContent className="p-3.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span className="flex items-center gap-1.5 font-bold">
                <Award size={14} className="text-emerald-400" /> Maths
              </span>
              <span className="text-[11px] font-bold text-emerald-300">
                {currentUserPoints.math?.toLocaleString() || 0} EP
              </span>
            </div>
            <div className="text-xl font-black text-white">
              {currentUserRanks.math && currentUserRanks.math > 0 ? `#${currentUserRanks.math}` : "Unranked"}
            </div>
            <p className="text-[10px] text-slate-500 mt-0.5">Subject Specialist</p>
          </CardContent>
        </Card>
      </div>

      {/* Main View Mode Selector: Cohort vs National */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as any)} className="space-y-6">
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <TabsList className="bg-[#0e192b] border border-border">
            <TabsTrigger value="cohort" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 text-xs font-bold">
              <Users className="w-3.5 h-3.5" />
              Weekly League Cohort (30 Scholars)
            </TabsTrigger>
            <TabsTrigger value="national" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground gap-2 text-xs font-bold">
              <Trophy className="w-3.5 h-3.5" />
              National Leaderboards
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="cohort" className="mt-0 focus-visible:outline-none">
          <WeeklyLeagueCohortCard />
        </TabsContent>

        <TabsContent value="national" className="mt-0 focus-visible:outline-none">
          <CompetitionLeaderboards
            showCurrentUserPosition={true}
            currentUserName={currentUserName}
            weeklyLeaders={weeklyLeaders}
            monthlyLeaders={monthlyLeaders}
            annualLeaders={annualLeaders}
            schoolLeaders={schoolLeaders}
            mathLeaders={mathLeaders}
            englishLeaders={englishLeaders}
            currentUserRanks={currentUserRanks}
            currentUserPoints={currentUserPoints}
            defaultTab="weekly"
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
