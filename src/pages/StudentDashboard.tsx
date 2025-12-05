import { useState, useEffect } from "react";
import { BookOpen, Trophy, TrendingUp, Target, Flame, LogOut, Settings, Menu } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompetitionLeaderboards } from "@/components/CompetitionLeaderboards";
import { PracticeAssignment } from "@/components/PracticeAssignment";
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

  const logo = theme === "dark" ? logoLight : logoDark;

  useEffect(() => {
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

      // Fetch student's class year
      const { data: studentData } = await supabase
        .from("students")
        .select("class_year")
        .eq("user_id", user.id)
        .single();

      if (studentData?.class_year) {
        setClassYear(studentData.class_year);
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

      const { data, error } = await supabase
        .from(tableName as any)
        .select("subject");

      if (data && !error) {
        const counts = data.reduce((acc: Record<string, number>, curr: any) => {
          acc[curr.subject] = (acc[curr.subject] || 0) + 1;
          return acc;
        }, {});
        setSubjectCounts(counts);
      }
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

    fetchUserData();
    fetchQuestionCounts();
    fetchStreak();
  }, [user]);

  const subjects = [
    { name: "Mathematics", icon: "📐", difficulty: "Core Subject", questions: subjectCounts["Mathematics"] || 0 },
    { name: "English Language", icon: "📚", difficulty: "Core Subject", questions: subjectCounts["English Language"] || 0 },
    { name: "Basic Science", icon: "🔬", difficulty: "Core Subject", questions: subjectCounts["Basic Science"] || 0 },
    { name: "Social Studies", icon: "🌍", difficulty: "Core Subject", questions: subjectCounts["Social Studies"] || 0 },
  ];

  const topics = [
    { name: "Number & Numeration", subject: "Mathematics", icon: "➗", questions: 420 },
    { name: "Comprehension Passages", subject: "English", icon: "📖", questions: 380 },
    { name: "Living Things", subject: "Basic Science", icon: "🦋", questions: 325 },
    { name: "Grammar & Composition", subject: "English", icon: "✍️", questions: 290 },
    { name: "Algebraic Processes", subject: "Mathematics", icon: "📐", questions: 285 },
    { name: "Nigerian History", subject: "Social Studies", icon: "📜", questions: 245 },
  ];

  const badges = [
    { name: "First Quiz", icon: "🎯", earned: true },
    { name: "10 Quiz Master", icon: "⭐", earned: true },
    { name: "5-Day Streak", icon: "🔥", earned: true },
    { name: "Top 10%", icon: "👑", earned: false },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20">
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

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back, {userName}! 🎉</h2>
          {classYear && (
            <p className="text-lg font-semibold text-primary mb-2">
              {classYear === 'year_6' ? 'Year 6 • Common Entrance' : 'Year 9 • BECE'}
            </p>
          )}
          <p className="text-muted-foreground">Ready to ace your exams? You're 2 ranks away from Top 10 nationally!</p>
        </div>

        {/* Quick Stats - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8 animate-slide-up">
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

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-10">
            {/* Practice Section */}
            <Card className="bg-gradient-to-br from-card to-background border-border/50 shadow-soft animate-scale-in">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="text-primary" size={24} />
                  Practice Zone
                </CardTitle>
                <CardDescription>Choose your learning path</CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2 mb-6">
                    <TabsTrigger value="subject">By Subject</TabsTrigger>
                    <TabsTrigger value="topic">By Topic</TabsTrigger>
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
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="hero"
                          size="sm"
                          className="w-full sm:w-auto sm:min-w-[140px] min-h-[44px]"
                          onClick={() => navigate(`/quiz?subject=${encodeURIComponent(subject.name)}`)}
                        >
                          Start Practice
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
                            <p className="text-xs sm:text-sm text-muted-foreground">
                              {topic.subject} • {topic.questions} questions
                            </p>
                          </div>
                        </div>
                        <Button
                          variant="hero"
                          size="sm"
                          className="w-full sm:w-auto sm:min-w-[140px] min-h-[44px]"
                          onClick={() => navigate("/quiz")}
                        >
                          Start Practice
                        </Button>
                      </div>
                    ))}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>

            {/* Practice Assignments */}
            <div className="animate-scale-in" style={{ animationDelay: "0.1s" }}>
              <PracticeAssignment onStartAssignment={() => navigate("/quiz")} />
            </div>

            <Separator className="my-8 opacity-[0.05]" />

            {/* Progress Report */}
            <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <ProgressReport />
            </div>

            <Separator className="my-8 opacity-[0.05]" />

            {/* Competition Leaderboards */}
            <div className="animate-scale-in" style={{ animationDelay: "0.3s" }}>
              <CompetitionLeaderboards
                showCurrentUserPosition={true}
                currentUserName="Ada"
                currentUserRanks={{ monthly: 12, annual: 8 }}
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
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
                  <div className="flex gap-1">
                    {[85, 78, 82, 90, 88].map((score, idx) => (
                      <div key={idx} className="flex-1 bg-muted rounded overflow-hidden">
                        <div
                          className="bg-gradient-accent"
                          style={{ height: `${score}px`, transition: "all 0.3s" }}
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
