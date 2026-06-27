import { useState, useEffect } from "react";
import { BookOpen, Trophy, TrendingUp, Target, Flame, LogOut, Settings, Menu, Lock } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompetitionLeaderboards } from "@/components/CompetitionLeaderboards";
import { PracticeAssignment, Assignment } from "@/components/PracticeAssignment";
import { ProgressReport } from "@/components/ProgressReport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { theme } = useTheme();
  const [activeTab, setActiveTab] = useState("subject");
  const [userName, setUserName] = useState("Student");
  const [classYear, setClassYear] = useState<string | null>(null);
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});
  const [currentStreak, setCurrentStreak] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);

  const logo = theme === "dark" ? logoLight : logoDark;

  const fetchUserData = async () => {
    if (!user) return;

    // Fetch user name
    const { data: profileData } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    if (profileData?.full_name) {
      const firstName = profileData.full_name.split(" ")[0];
      setUserName(firstName);
    }

    // Fetch student's class year and premium status
    const { data: studentData } = await supabase
      .from("students")
      .select("class_year, is_premium")
      .eq("user_id", user.id)
      .single();

    if (studentData) {
      if (studentData.class_year) setClassYear(studentData.class_year);
      setIsPremium(!!studentData.is_premium);
    }
  };

  const fetchQuestionCounts = async () => {
    if (!user) return;

    // First get the student's class year
    const { data: studentData } = await supabase
      .from("students")
      .select("class_year")
      .eq("user_id", user.id)
      .single();

    if (!studentData?.class_year) return;

    // Determine which table to query based on class year
    const tableName = studentData.class_year === 'year_6'
      ? 'quiz_questions_year6'
      : 'quiz_questions_year9';

    const subjectsToFetch = ["Mathematics", "English Language", "Basic Science", "Social Studies"];
    const counts: Record<string, number> = {};
    
    await Promise.all(
      subjectsToFetch.map(async (subject) => {
        const { count, error } = await supabase
          .from(tableName as any)
          .select("*", { count: 'exact', head: true })
          .eq("subject", subject);
        
        if (!error && count !== null) {
          counts[subject] = count;
        }
      })
    );
    setSubjectCounts(counts);
  };

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

  const fetchAssignments = async () => {
    if (!user) return;

    setIsLoadingAssignments(true);
    try {
      // First get student ID
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!studentData?.id) return;

      const { data, error } = await supabase
        .from("practice_assignments")
        .select("*")
        .eq("student_id", studentData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setAssignments(data as Assignment[]);
    } catch (error) {
      console.error("Error fetching assignments:", error);
    } finally {
      setIsLoadingAssignments(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchUserData(),
      fetchQuestionCounts(),
      fetchStreak(),
      fetchAssignments()
    ]);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchUserData();
    fetchQuestionCounts();
    fetchStreak();
    fetchAssignments();
  }, [user]);

  // Pull to refresh logic
  useEffect(() => {
    let startY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
    };

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0].clientY;
      const diff = currentY - startY;

      // Only trigger if at top of page and pulling down significantly
      if (window.scrollY === 0 && diff > 100 && !refreshing) {
        handleRefresh();
      }
    };

    document.addEventListener('touchstart', handleTouchStart);
    document.addEventListener('touchmove', handleTouchMove);

    return () => {
      document.removeEventListener('touchstart', handleTouchStart);
      document.removeEventListener('touchmove', handleTouchMove);
    };
  }, [refreshing]);

  const subjects = [
    { name: "Mathematics", icon: "📐", difficulty: "Core Subject", questions: subjectCounts["Mathematics"] || 0, isPremium: false },
    { name: "English Language", icon: "📚", difficulty: "Core Subject", questions: subjectCounts["English Language"] || 0, isPremium: false },
    { name: "Basic Science", icon: "🔬", difficulty: "Core Subject", questions: subjectCounts["Basic Science"] || 0, isPremium: true },
    { name: "Social Studies", icon: "🌍", difficulty: "Core Subject", questions: subjectCounts["Social Studies"] || 0, isPremium: true },
  ];

  const topics = [
    { name: "Number & Numeration", subject: "Mathematics", icon: "➗", questions: 420, isPremium: false },
    { name: "Comprehension Passages", subject: "English", icon: "📖", questions: 380, isPremium: false },
    { name: "Living Things", subject: "Basic Science", icon: "🦋", questions: 325, isPremium: true },
    { name: "Grammar & Composition", subject: "English", icon: "✍️", questions: 290, isPremium: false },
    { name: "Algebraic Processes", subject: "Mathematics", icon: "📐", questions: 285, isPremium: true },
    { name: "Nigerian History", subject: "Social Studies", icon: "📜", questions: 245, isPremium: true },
  ];

  const badges = [
    { name: "First Quiz", icon: "🎯", earned: true },
    { name: "10 Quiz Master", icon: "⭐", earned: true },
    { name: "5-Day Streak", icon: "🔥", earned: true },
    { name: "Top 10%", icon: "👑", earned: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20 overflow-hidden">
      {refreshing && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-primary text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-4">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent"></div>
          Refreshing...
        </div>
      )}

      {/* Header - Mobile Optimized */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          {/* Logo & Streak */}
          <div className="flex items-center gap-2 sm:gap-4">
            <img
              src={logo}
              alt="Éclat Logo"
              className="h-10 sm:h-12 md:h-16 w-auto cursor-pointer"
              onClick={() => navigate("/")}
            />
            {/* Streak - Hide on very small screens */}
            <div className={`hidden xs:flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 py-1 rounded-full ${currentStreak === 0
              ? 'bg-destructive/20'
              : currentStreak >= 7
                ? 'bg-green-500/20'
                : 'bg-accent-light'
              }`}>
              <Flame className={`${currentStreak === 0
                ? 'text-destructive'
                : currentStreak >= 7
                  ? 'text-green-600'
                  : 'text-accent'
                }`} size={14} />
              <span className={`text-xs sm:text-sm font-semibold ${currentStreak === 0
                ? 'text-destructive'
                : currentStreak >= 7
                  ? 'text-green-600'
                  : 'text-accent'
                }`}>{currentStreak}</span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Desktop: Show all buttons */}
            <div className="hidden md:flex items-center gap-4">
              <ThemeToggle />
              <Button variant="ghost" size="icon" className="h-10 w-10">
                <Settings size={20} />
              </Button>
              <Button variant="ghost" size="icon" className="h-10 w-10" onClick={signOut}>
                <LogOut size={20} />
              </Button>
            </div>

            {/* Mobile: Dropdown menu + Theme toggle */}
            <div className="md:hidden flex items-center gap-2">
              <ThemeToggle />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-10 w-10">
                    <Menu size={20} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={signOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign Out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8">
        {/* Welcome Section - Mobile Optimized */}
        <div className="mb-6 sm:mb-8 md:animate-fade-in">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Welcome back, {userName}! <span className="inline-block">🎉</span>
          </h2>
          {classYear && (
            <p className="text-base sm:text-lg font-semibold text-primary mb-2">
              {classYear === 'year_6' ? 'Year 6 • Common Entrance' : 'Year 9 • BECE'}
            </p>
          )}
          <p className="text-sm sm:text-base text-muted-foreground">
            Ready to ace your exams? <span className="hidden sm:inline">You're 2 ranks away from Top 10 nationally!</span>
            <span className="sm:hidden">Keep practicing!</span>
          </p>
        </div>

        {/* Quick Stats - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 md:animate-slide-up">
          <Card className="border-2 hover:shadow-hover transition-all">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Total Questions</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">847</p>
                </div>
                <Target className="text-primary" size={24} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:shadow-hover transition-all">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Average Score</p>
                  <p className="text-2xl sm:text-3xl font-bold text-accent">78%</p>
                </div>
                <TrendingUp className="text-accent" size={24} />
              </div>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-primary-light/20 to-background border-primary-light/30 shadow-soft hover:shadow-hover transition-all sm:col-span-2 md:col-span-1">
            <CardContent className="p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs sm:text-sm text-muted-foreground">Rank This Month</p>
                  <p className="text-2xl sm:text-3xl font-bold text-primary">#12</p>
                </div>
                <Trophy className="text-accent" size={24} />
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator className="my-10 opacity-[0.07]" />

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6 lg:space-y-10">
            {/* Practice Section */}
            <Card className="bg-gradient-to-br from-card to-background border-border/50 shadow-soft md:animate-scale-in max-w-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="text-primary" size={24} />
                  Practice Zone
                </CardTitle>
                <CardDescription>Choose your learning path</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-4 sm:mb-6">
                    <TabsTrigger value="subject" className="text-xs sm:text-sm">
                      <BookOpen className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">By </span>Subject
                    </TabsTrigger>
                    <TabsTrigger value="topic" className="text-xs sm:text-sm">
                      <Target className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">By </span>Topic
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="subject" className="space-y-3">
                    {subjects.map((subject, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/30 border border-border/30 hover:bg-primary-light/20 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl sm:text-3xl">{subject.icon}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{subject.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {subject.questions} questions
                              </p>
                              <span className="text-xs px-2 py-0.5 rounded-full bg-primary-light text-primary font-medium hidden sm:inline-block">
                                {subject.difficulty}
                              </span>
                              {subject.isPremium && !isPremium && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 font-medium flex items-center gap-1">
                                  <Lock size={12} /> Premium
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant={subject.isPremium && !isPremium ? "outline" : "hero"}
                          size="sm"
                          className="w-full sm:w-auto sm:min-w-[140px] min-h-[44px]"
                          onClick={() => {
                            if (subject.isPremium && !isPremium) {
                              // Ignore or show toast
                            } else {
                              navigate(`/quiz?subject=${encodeURIComponent(subject.name)}`)
                            }
                          }}
                          disabled={subject.isPremium && !isPremium}
                        >
                          {subject.isPremium && !isPremium ? "Locked" : "Start Practice"}
                        </Button>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="topic" className="space-y-3">
                    {topics.map((topic, index) => (
                      <div
                        key={index}
                        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg bg-muted/30 border border-border/30 hover:bg-primary-light/20 hover:border-primary/30 hover:shadow-soft transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-2xl sm:text-3xl">{topic.icon}</span>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-foreground truncate">{topic.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <p className="text-xs sm:text-sm text-muted-foreground">
                                {topic.subject} • {topic.questions} questions
                              </p>
                              {topic.isPremium && !isPremium && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500 font-medium flex items-center gap-1">
                                  <Lock size={12} /> Premium
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          variant={topic.isPremium && !isPremium ? "outline" : "hero"}
                          size="sm"
                          className="w-full sm:w-auto sm:min-w-[140px] min-h-[44px]"
                          onClick={() => {
                            if (topic.isPremium && !isPremium) {
                              // ignore
                            } else {
                              navigate("/quiz")
                            }
                          }}
                          disabled={topic.isPremium && !isPremium}
                        >
                          {topic.isPremium && !isPremium ? "Locked" : "Start Practice"}
                        </Button>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Practice Assignments */}
            <div className="md:animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <PracticeAssignment 
                assignments={assignments} 
                isLoading={isLoadingAssignments}
              />
            </div>

            {/* Mobile Progress Summary - Visible on mobile/tablet */}
            <div className="lg:hidden md:animate-scale-in" style={{ animationDelay: "0.15s" }}>
              <Card className="border-2">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="text-accent" size={18} />
                    Quick Progress Stats
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex gap-1 h-12">
                    {[85, 78, 82, 90, 88].map((score, idx) => (
                      <div key={idx} className="flex-1 bg-muted rounded overflow-hidden">
                        <div
                          className="bg-gradient-accent w-full"
                          style={{ height: `${score}%`, transition: "all 0.3s" }}
                        ></div>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Last 5 sessions</span>
                    <span className="font-medium text-accent">↑ 12% improvement</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Separator className="my-8 opacity-[0.05]" />

            {/* Progress Report */}
            <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <ProgressReport />
            </div>

            <Separator className="my-8 opacity-[0.05]" />

            {/* Competition Leaderboards */}
            <div className="md:animate-scale-in" style={{ animationDelay: "0.3s" }}>
              <CompetitionLeaderboards
                showCurrentUserPosition={true}
                currentUserName="Ada"
                currentUserRanks={{ monthly: 12, annual: 8 }}
              />
            </div>
          </div>

          {/* Sidebar - Desktop Only for detailed view */}
          <div className="hidden lg:block space-y-6">
            {/* Progress Tracking */}
            <Card className="border-2 animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="text-accent" size={20} />
                  Your Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Last 5 Sessions</span>
                    <span className="font-semibold text-accent">↑ 12%</span>
                  </div>
                  <div className="flex gap-1 h-24">
                    {[85, 78, 82, 90, 88].map((score, idx) => (
                      <div key={idx} className="flex-1 bg-muted rounded overflow-hidden flex items-end">
                        <div
                          className="bg-gradient-accent w-full"
                          style={{ height: `${score}%`, transition: "all 0.3s" }}
                        ></div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="pt-4 border-t">
                  <p className="text-sm font-semibold text-muted-foreground mb-3">Badges Earned</p>
                  <div className="grid grid-cols-2 gap-2">
                    {badges.map((badge, idx) => (
                      <div
                        key={idx}
                        className={`flex items-center gap-2 p-2 rounded border ${badge.earned ? "bg-accent-light border-accent" : "bg-muted border-border opacity-50"
                          }`}
                      >
                        <span className="text-lg">{badge.icon}</span>
                        <span className="text-xs font-medium">{badge.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

          </div>
        </div>
      </div>
    </div>
  );
}
