import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { BookOpen, ClipboardList, TrendingUp, Trophy, Target, ArrowRight, Copy, Check, Swords, Sparkles, BarChart3, Shield, Zap, Flame, Award, AlertCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { getBadgeLevel, BadgeLevel } from "@/components/WinnerBadge";
import { calculateStudentLevel } from "@/services/gamification/levelEngine";
import type { StudentLevelInfo } from "@/services/gamification/types";
import { getLeagueTierConfig } from "@/services/gamification/leagueEngine";
import { BadgeShowcase } from "@/components/gamification/BadgeShowcase";
import { toast } from "sonner";

interface QuizResult {
  id: string;
  subject: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

interface StudentBadge {
  name: string;
  icon: string;
  earned: boolean;
}

// --- Cached data layer (TanStack Query) -------------------------------------
// The former single 14-step await waterfall has been split into two cached,
// dependency-linked queries. Render behavior (progressive fill, same variable
// names) is preserved.
export default function StudentDashboardOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Query 1: identity — profile, student record and question bank size
  const identityQuery = useQuery({
    queryKey: ["student-dashboard", user?.id ?? "anon", "identity"],
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: async () => {
      const [{ data: profileData }, { data: studentData }] = await Promise.all([
        supabase.from("profiles").select("full_name, unique_id").eq("id", user!.id).single(),
        supabase.from("students").select("id, class_year").eq("user_id", user!.id).single(),
      ]);

      let availableQuestionsCount = 0;
      if (studentData?.class_year) {
        const tableName: "quiz_questions_year6" | "quiz_questions_year9" =
          studentData.class_year === "year_6" ? "quiz_questions_year6" : "quiz_questions_year9";
        const { count: questionsCount } = await supabase
          .from(tableName)
          .select("*", { count: "exact", head: true });
        availableQuestionsCount = questionsCount ?? 0;
      }

      return {
        userName: profileData?.full_name?.split(" ")[0] || "Student",
        studentCode: profileData?.unique_id || "",
        studentId: studentData?.id ?? null,
        classYear: (studentData?.class_year as string | null) ?? null,
        availableQuestionsCount,
      };
    },
  });

  const studentId = identityQuery.data?.studentId ?? null;

  // Query 2: gamification + academic stats — depends on the resolved student id
  const statsQuery = useQuery({
    queryKey: ["student-dashboard", user?.id ?? "anon", studentId ?? "no-student", "stats"],
    enabled: !!studentId,
    staleTime: 30 * 1000,
    queryFn: async () => {
      const sid = studentId as string;
      const todayUTC = new Date().toISOString().split("T")[0];
      const todayStart = `${todayUTC}T00:00:00.000Z`;

      const [
        gameProfileRes,
        badgesRes,
        weakTopicsRes,
        pendingRes,
        recentRes,
        allResultsRes,
        platformRankRes,
      ] = await Promise.all([
        supabase.from("student_gamification_profile").select("*").eq("student_id", sid).maybeSingle(),
        supabase.from("student_badges").select("badge_id").eq("student_id", sid),
        supabase
          .from("student_topic_mastery")
          .select("subject, topic, rolling_accuracy")
          .eq("student_id", sid)
          .eq("status", "weak")
          .order("rolling_accuracy", { ascending: true })
          .limit(1),
        supabase
          .from("practice_assignments")
          .select("*", { count: "exact", head: true })
          .eq("student_id", sid)
          .eq("status", "pending"),
        supabase
          .from("quiz_results")
          .select("id, subject, score, total_questions, completed_at")
          .eq("student_id", sid)
          .order("completed_at", { ascending: false })
          .limit(3),
        supabase.from("quiz_results").select("total_questions, score").eq("student_id", sid),
        // Platform-wide rank metrics come from a scoped SECURITY DEFINER RPC;
        // quiz_results are no longer readable across students.
        supabase.rpc("get_platform_student_rank"),
      ]);

      const gameProfile = gameProfileRes.data;
      let currentStreak = 0;
      let dailyChallengeCompleted = false;

      if (gameProfile) {
        currentStreak = Number(gameProfile.streak_count || 0);

        // Daily-challenge completion with two fallback checks
        let challengeDone = gameProfile.last_daily_challenge_date === todayUTC;

        if (!challengeDone) {
          const { data: todayLedger } = await supabase
            .from("student_points_ledger")
            .select("id")
            .eq("student_id", sid)
            .eq("source_type", "daily_challenge")
            .gte("created_at", todayStart)
            .limit(1);
          if (todayLedger && todayLedger.length > 0) challengeDone = true;
        }

        if (!challengeDone) {
          const { data: todayDailyResults } = await supabase
            .from("quiz_results")
            .select("id")
            .eq("student_id", sid)
            .eq("subject", "Daily Challenge")
            .gte("completed_at", todayStart)
            .limit(1);
          if (todayDailyResults && todayDailyResults.length > 0) challengeDone = true;
        }

        // The completion pipeline (complete-quiz-session) owns
        // last_daily_challenge_date writes; the profile is no longer
        // client-writable.
        dailyChallengeCompleted = challengeDone;
      } else {
        // Fallback to legacy streak data if gamification profile is pending
        const { data: streakData } = await supabase
          .from("student_streaks")
          .select("current_streak")
          .eq("student_id", sid)
          .maybeSingle();
        if (streakData) currentStreak = streakData.current_streak;
      }

      const levelInfo = calculateStudentLevel(Number(gameProfile?.lifetime_ep || 0));
      const streakShields = Number(gameProfile?.streak_shields || 0);
      const currentLeagueTier = Number(gameProfile?.current_league_tier || 1);
      const pinnedBadgeIds = (gameProfile?.pinned_badge_ids as (string | null)[]) || [];
      const earnedBadgeIds = (badgesRes.data || []).map((b) => b.badge_id);
      const focusTopic = weakTopicsRes.data?.[0] ?? null;
      const pendingAssignmentsCount = pendingRes.count ?? 0;
      const recentActivity = recentRes.data ?? [];

      const allResults = allResultsRes.data ?? [];
      const platformRank = platformRankRes.data?.[0] ?? null;
      const completedQuizzesCount = allResults.length;
      let totalQuestions = 0;
      let averageScore = 0;
      let totalWins = 0;
      let badgeLevel: BadgeLevel = "bronze";
      let badges: StudentBadge[] = [];

      if (allResults.length > 0) {
        totalQuestions = allResults.reduce((sum, result) => sum + result.total_questions, 0);
        averageScore = Math.round(allResults.reduce((sum, result) => sum + result.score, 0) / allResults.length);
        totalWins = allResults.filter((result) => result.score >= 80).length;
        badgeLevel = getBadgeLevel(totalWins);

        const firstQuiz = allResults.length >= 1;
        const tenQuiz = allResults.length >= 10;
        const streakBadge = currentStreak >= 5;
        const perfectScore = allResults.some((q) => q.score === 100);

        // To determine Top 10% (platform rank served by a scoped RPC)
        let top10Badge = false;
        if (platformRank && platformRank.score_rank != null && (platformRank.score_total ?? 0) > 0) {
          top10Badge = platformRank.score_rank <= 3 || platformRank.score_rank / platformRank.score_total <= 0.1;
        } else {
          top10Badge = averageScore >= 85;
        }

        badges = [
          { name: "First Quiz", icon: "🎯", earned: firstQuiz },
          { name: "10 Quiz Master", icon: "⭐", earned: tenQuiz },
          { name: "5-Day Streak", icon: "🔥", earned: streakBadge },
          { name: "Top 10%", icon: "👑", earned: top10Badge },
          { name: "Perfect Score", icon: "💯", earned: perfectScore },
        ];
      }

      // Monthly rank (by total points, matching the National Leaderboard),
      // served by the same scoped RPC.
      let monthlyRank: number | null = null;
      if (platformRank && platformRank.points_rank != null && (platformRank.points_total ?? 0) > 0) {
        monthlyRank = platformRank.points_rank;
      }

      return {
        levelInfo,
        streakShields,
        currentLeagueTier,
        pinnedBadgeIds,
        currentStreak,
        dailyChallengeCompleted,
        earnedBadgeIds,
        focusTopic,
        pendingAssignmentsCount,
        recentActivity,
        totalQuestions,
        averageScore,
        completedQuizzesCount,
        totalWins,
        badgeLevel,
        badges,
        monthlyRank,
      };
    },
  });

  const identity = identityQuery.data;
  const userName = identity?.userName ?? "Student";
  const studentCode = identity?.studentCode ?? "";
  const classYear = identity?.classYear ?? null;
  const availableQuestionsCount = identity?.availableQuestionsCount ?? 0;

  const stats = statsQuery.data;
  const recentActivity = stats?.recentActivity ?? [];
  const totalQuestions = stats?.totalQuestions ?? 0;
  const averageScore = stats?.averageScore ?? 0;
  const monthlyRank = stats?.monthlyRank ?? null;
  const currentStreak = stats?.currentStreak ?? 0;
  const pendingAssignmentsCount = stats?.pendingAssignmentsCount ?? 0;
  const completedQuizzesCount = stats?.completedQuizzesCount ?? 0;
  const levelInfo = stats?.levelInfo ?? calculateStudentLevel(0);
  const streakShields = stats?.streakShields ?? 0;
  const currentLeagueTier = stats?.currentLeagueTier ?? 1;
  const earnedBadgeIds = stats?.earnedBadgeIds ?? [];
  const focusTopic = stats?.focusTopic ?? null;
  const dailyChallengeCompleted = stats?.dailyChallengeCompleted ?? false;
  const totalWins = stats?.totalWins ?? 0;
  const badgeLevel: BadgeLevel = stats?.badgeLevel ?? "bronze";
  const badges = stats?.badges ?? [];

  // Pinned badges are editable locally; seeded from the cached stats query.
  // NULL entries are empty showcase slots (positions preserved).
  const [pinnedBadgeIds, setPinnedBadgeIds] = useState<(string | null)[]>([]);
  useEffect(() => {
    if (stats?.pinnedBadgeIds) setPinnedBadgeIds(stats.pinnedBadgeIds);
  }, [stats?.pinnedBadgeIds]);

  // Level-gated showcase slots (levelEngine milestones: slot #1 at level 3,
  // slot #2 at level 5, full 5-slot showcase at level 10).
  const unlockedSlotsCount =
    levelInfo.level >= 10 ? 5 : levelInfo.level >= 5 ? 2 : levelInfo.level >= 3 ? 1 : 0;


  const featureCards = [
    {
      title: "Start Practice",
      description: "Practice by subject or topic",
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
      url: "/dashboard/student/practice",
      badge: availableQuestionsCount > 0 
        ? `${availableQuestionsCount.toLocaleString()} Questions`
        : "Start Now",
    },
    {
      title: "Duel of Minds",
      description: "Challenge other students",
      icon: Swords,
      color: "text-purple-600",
      bgColor: "bg-purple-500/10",
      url: "/dashboard/student/duel-of-minds",
      badge: "Compete Now",
    },
    {
      title: "View Assignments",
      description: "Check your practice assignments",
      icon: ClipboardList,
      color: "text-accent",
      bgColor: "bg-accent/10",
      url: "/dashboard/student/assignments",
      badge: `${pendingAssignmentsCount} Pending`,
    },
    {
      title: "Check Progress",
      description: "View your performance analytics",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      url: "/dashboard/student/progress",
      badge: `${completedQuizzesCount} ${completedQuizzesCount === 1 ? 'Quiz' : 'Quizzes'}`,
    },
    {
      title: "See Rankings",
      description: "National leaderboard positions",
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10",
      url: "/dashboard/student/leaderboard",
      badge: monthlyRank ? `Rank #${monthlyRank}` : "Not Ranked",
    },
  ];

  const [copiedCode, setCopiedCode] = useState(false);

  const handleCopyCode = async () => {
    if (studentCode) {
      await navigator.clipboard.writeText(studentCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const pinBadgesMutation = useMutation({
    mutationFn: async (newPinnedIds: (string | null)[]) => {
      // Scoped RPC — the gamification profile is no longer client-writable.
      // NULL entries are empty slots; the SQL text[] keeps slot positions.
      const { error } = await supabase.rpc("update_pinned_badges", {
        p_badge_ids: newPinnedIds as string[],
      });
      if (error) throw error;
      return newPinnedIds;
    },
    onMutate: (newPinnedIds) => {
      const previous = pinnedBadgeIds;
      setPinnedBadgeIds(newPinnedIds);
      return { previous };
    },
    onSuccess: () => {
      toast.success("Badge showcase updated!");
      queryClient.invalidateQueries({ queryKey: ["student-dashboard", user?.id ?? "anon"] });
    },
    onError: (_error, _newPinnedIds, context) => {
      // Undo the optimistic pin so the UI never shows an unsaved state.
      if (context) setPinnedBadgeIds(context.previous);
      toast.error("Failed to update badge showcase");
    },
  });

  // Rejects on RPC failure so dialog/gallery callers can keep their UI state;
  // the toast and optimistic rollback live in the mutation handlers above.
  const handleUpdatePinnedBadges = (newPinnedIds: (string | null)[]) => {
    if (!studentId) return Promise.resolve();
    return pinBadgesMutation.mutateAsync(newPinnedIds).then(() => undefined);
  };

  return (
    <div className="w-full px-5 py-8 text-foreground sm:px-8">
      <section className="relative mb-7 overflow-hidden rounded-xl border border-border bg-card text-card-foreground px-6 py-7 shadow-sm sm:px-8">
        <div className="absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(14,157,204,.12),transparent_65%)] dark:bg-[radial-gradient(circle_at_center,rgba(14,157,204,.22),transparent_65%)]" />
        <div className="relative max-w-xl">
          <p className="mb-2 flex items-center gap-2 text-sm text-foreground/80">Welcome back, {userName}! <Sparkles className="h-4 w-4 text-amber-500" /></p>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">{classYear === 'year_6' ? 'Year 6 · Common Entrance' : 'Year 9 · BECE'}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Level {levelInfo.level} {levelInfo.title} · {levelInfo.lifetimeEP.toLocaleString()} Lifetime EP</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/dashboard/student/practice')} className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold shadow-sm">continue practice <ArrowRight className="ml-2 h-4 w-4" /></Button>
            {dailyChallengeCompleted ? (
              <Button disabled className="border border-emerald-500/40 bg-emerald-500/20 text-emerald-600 dark:text-emerald-300 font-bold cursor-default">
                Daily Challenge Done <CheckCircle2 className="ml-1.5 h-4 w-4" />
              </Button>
            ) : (
              <Button onClick={() => navigate('/quiz?mode=daily_challenge')} className="bg-gradient-to-r from-amber-400 to-orange-400 text-slate-950 font-bold hover:from-amber-300 hover:to-orange-300 shadow-md shadow-amber-500/20">
                Daily Challenge <Flame className="ml-1.5 h-4 w-4" />
              </Button>
            )}
            <Button onClick={() => navigate('/quiz')} variant="outline">take mock exam</Button>
          </div>
        </div>
      </section>

      {/* Daily Challenge Spotlight Card (PRD Section 3.6 & Epic EP-04) */}
      <section className={`mb-7 overflow-hidden rounded-xl border p-5 shadow-sm transition-all ${
        dailyChallengeCompleted
          ? "border-emerald-500/30 bg-emerald-500/5 dark:bg-gradient-to-r dark:from-emerald-500/15 dark:via-[#13282c] dark:to-[#0e192b]"
          : "border-amber-500/30 bg-amber-500/5 dark:bg-gradient-to-r dark:from-amber-500/15 dark:via-[#231e33] dark:to-[#0e192b]"
      }`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border shadow-inner ${
              dailyChallengeCompleted
                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                : "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
            }`}>
              {dailyChallengeCompleted ? (
                <CheckCircle2 className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <Flame className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-[10px] font-black uppercase tracking-wider ${
                  dailyChallengeCompleted ? "text-emerald-600 dark:text-emerald-400" : "text-amber-600 dark:text-amber-400"
                }`}>
                  {dailyChallengeCompleted ? "Daily Challenge Claimed" : "Daily Challenge • 10 Questions"}
                </span>
                <span className={`rounded px-1.5 py-0.2 text-[9px] font-bold ${
                  dailyChallengeCompleted ? "bg-emerald-400/20 text-emerald-700 dark:text-emerald-300" : "bg-amber-400/20 text-amber-700 dark:text-amber-300"
                }`}>
                  +20 to +50 EP
                </span>
              </div>
              <h3 className="text-lg font-black text-foreground mt-0.5">
                {dailyChallengeCompleted
                  ? "Today's Challenge Crushed! 🌟"
                  : "Today's 10-Question Sprint"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-xl">
                {dailyChallengeCompleted
                  ? "You claimed today's rewards and protected your daily streak! Fresh challenge unlocks at 00:00 UTC."
                  : `Curated mixed questions across your curriculum. Earn +20 baseline EP up to +50 EP for high accuracy and keep your ${currentStreak}-day streak alive!`}
              </p>
            </div>
          </div>

          <div className="shrink-0 w-full sm:w-auto">
            {dailyChallengeCompleted ? (
              <Button
                disabled
                className="w-full sm:w-auto border border-emerald-500/40 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold cursor-default"
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" /> Completed for Today
              </Button>
            ) : (
              <Button
                onClick={() => navigate("/quiz?mode=daily_challenge")}
                className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black hover:from-amber-400 hover:to-orange-400 shadow-md shadow-amber-500/20"
              >
                Start Daily Challenge →
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Signature Weak-Topic Focus Recommendation (PRD Section 1.2 & 3.3) */}
      {focusTopic && (
        <section className="mb-7 rounded-xl border border-amber-500/40 bg-amber-500/5 dark:bg-gradient-to-r dark:from-amber-500/10 dark:via-amber-500/5 dark:to-transparent p-5">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" />
                Recommended Focus Area (Weak Topic)
              </span>
              <h3 className="text-lg font-black text-foreground mt-0.5">
                Confront Your Weakness: {focusTopic.topic} ({focusTopic.subject})
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Current accuracy is {Math.round(focusTopic.rolling_accuracy)}%. Practice this topic now to earn +25% Focus EP and the +75 EP Transition Reward!
              </p>
            </div>
            <Button
              onClick={() => navigate(`/quiz?subject=${encodeURIComponent(focusTopic.subject)}&topic=${encodeURIComponent(focusTopic.topic)}`)}
              className="bg-amber-500 text-slate-950 hover:bg-amber-400 font-bold shrink-0 shadow-sm"
            >
              Confront Weakness →
            </Button>
          </div>
        </section>
      )}

      {/* The Four-Pillar Measurement System (PRD Section 2) */}
      <section className="mb-8 grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        {/* Pillar 1: Éclat Points & Level */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-sky-50 text-sky-600 dark:bg-[#183149] dark:text-[#71c9ed] p-2">
                  <Zap size={18} />
                </div>
                <span className="text-xs font-bold text-foreground">Level {levelInfo.level}</span>
              </div>
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                {levelInfo.title}
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-sky-600 dark:text-[#71c9ed]">
              {levelInfo.lifetimeEP.toLocaleString()} <span className="text-xs font-bold text-muted-foreground">EP</span>
            </p>
          </div>
          <div className="mt-3">
            <Progress value={levelInfo.progressPercent} className="h-1.5 rounded-full" />
            <span className="text-[10px] text-muted-foreground mt-1 block">
              {levelInfo.progressPercent}% to Level {levelInfo.level + 1}
            </span>
          </div>
        </div>

        {/* Pillar 2: Academic Mastery Score % */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="mb-3 flex items-center gap-2.5">
              <div className="rounded-lg bg-emerald-50 text-emerald-600 dark:bg-[#183149] dark:text-emerald-400 p-2">
                <Target size={18} />
              </div>
              <span className="text-xs font-bold text-foreground">Academic Mastery</span>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400">
              {averageScore}%
            </p>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {totalQuestions} questions evaluated
          </p>
        </div>

        {/* Pillar 3: Competitive Rank & League */}
        <div 
          onClick={() => navigate('/dashboard/student/leaderboard')}
          className="cursor-pointer group rounded-xl border border-border bg-card text-card-foreground p-5 flex flex-col justify-between hover:border-primary/40 transition-colors shadow-sm"
        >
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-amber-50 text-amber-600 dark:bg-[#183149] dark:text-amber-400 p-2">
                  <Trophy size={18} />
                </div>
                <span className="text-xs font-bold text-foreground">Competitive Rank</span>
              </div>
              <Badge variant="outline" className={`text-[10px] ${getLeagueTierConfig(currentLeagueTier).borderColor} ${getLeagueTierConfig(currentLeagueTier).color}`}>
                {getLeagueTierConfig(currentLeagueTier).badge} {getLeagueTierConfig(currentLeagueTier).name}
              </Badge>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400">
              {monthlyRank ? `#${monthlyRank}` : "—"}
            </p>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground flex items-center justify-between">
            <span>View 30-Player Cohort</span>
            <span className="text-primary font-bold group-hover:translate-x-0.5 transition-transform">→</span>
          </p>
        </div>

        {/* Pillar 4: Practice Streak & Shields */}
        <div className="rounded-xl border border-border bg-card text-card-foreground p-5 flex flex-col justify-between shadow-sm">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="rounded-lg bg-rose-50 text-rose-600 dark:bg-[#183149] dark:text-rose-500 p-2">
                  <Flame size={18} />
                </div>
                <span className="text-xs font-bold text-foreground">Daily Streak</span>
              </div>
              <div className="flex items-center gap-1 text-[11px] font-bold text-foreground">
                <Shield className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                <span>{streakShields} / 2</span>
              </div>
            </div>
            <p className="text-2xl sm:text-3xl font-black text-rose-600 dark:text-rose-500">
              {currentStreak} <span className="text-xs font-bold text-muted-foreground">Days</span>
            </p>
          </div>
          <p className="mt-3 text-[11px] text-muted-foreground">
            {streakShields > 0 ? `${streakShields} Streak Shield protected` : "Practice daily to build habit"}
          </p>
        </div>
      </section>

      <h2 className="mb-4 text-lg font-semibold text-foreground">Quick Actions</h2>
      <section className="mb-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {featureCards.slice(0, 4).map((feature) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.title}
              onClick={() => navigate(feature.url)}
              className="group flex items-center gap-3 rounded-xl border border-border bg-card text-card-foreground p-4 text-left transition hover:border-primary/50 hover:bg-muted/40 shadow-sm"
            >
              <span className={`rounded-lg bg-muted p-2 ${feature.color}`}>
                <Icon size={19} />
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block text-sm font-medium text-foreground">{feature.title}</strong>
                <small className="block text-xs text-muted-foreground">{feature.description}</small>
              </span>
              <ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
            </button>
          );
        })}
      </section>

      {/* 5-Slot Badge Showcase (PRD Section 9.1) */}
      <section className="mb-8">
        <BadgeShowcase
          earnedBadgeIds={earnedBadgeIds}
          pinnedBadgeIds={pinnedBadgeIds}
          onUpdatePinnedBadges={handleUpdatePinnedBadges}
          unlockedSlotsCount={unlockedSlotsCount}
          currentStreak={currentStreak}
          completedQuizzesCount={completedQuizzesCount}
          averageScore={averageScore}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Recent Activity</h2>
            <button onClick={() => navigate('/dashboard/student/progress')} className="text-xs text-primary font-semibold hover:underline">
              View All
            </button>
          </div>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-sm text-muted-foreground">Complete a practice quiz to see your recent activity.</p>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center gap-3">
                  <span className="rounded-lg bg-sky-50 text-sky-600 dark:bg-[#183149] dark:text-[#71c9ed] p-2">
                    <BarChart3 size={18} />
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.subject}</p>
                    <p className="text-xs text-muted-foreground">{activity.total_questions} questions · {formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true })}</p>
                  </div>
                  <strong className={activity.score >= 80 ? 'text-sky-600 dark:text-[#71c9ed]' : 'text-amber-600 dark:text-[#f4a83a]'}>
                    {activity.score}%
                  </strong>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card text-card-foreground p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-foreground">Parent Link Code</h2>
          <p className="mt-1 text-xs text-muted-foreground">Share this code with your parent or guardian</p>
          {studentCode ? (
            <>
              <code className="mt-5 block border border-dashed border-border bg-muted/60 px-3 py-4 text-center text-2xl font-bold tracking-[0.25em] text-primary rounded-xl font-mono select-all">
                {studentCode}
              </code>
              <Button onClick={handleCopyCode} variant="outline" className="mt-3 w-full">
                {copiedCode ? <><Check className="mr-2 h-4 w-4" />copied</> : <><Copy className="mr-2 h-4 w-4" />copy code</>}
              </Button>
            </>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">Your link code will appear here.</p>
          )}
        </div>
      </section>
      {badges.length > 0 && totalWins > 0 && <p className="mt-5 text-xs text-muted-foreground">{badgeLevel} badge · {totalWins} high scores</p>}
    </div>
  );
}
