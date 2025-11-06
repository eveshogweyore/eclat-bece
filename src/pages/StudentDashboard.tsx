import { useState, useEffect } from "react";
import { BookOpen, Trophy, TrendingUp, Target, Flame, LogOut, Settings } from "lucide-react";
import { ThemeToggle } from "@/components/ThemeToggle";
import { CompetitionLeaderboards } from "@/components/CompetitionLeaderboards";
import { PracticeAssignment } from "@/components/PracticeAssignment";
import { ProgressReport } from "@/components/ProgressReport";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import logo from "@/assets/logo.png";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const [activeTab, setActiveTab] = useState("subject");
  const [userName, setUserName] = useState("Student");
  const [classYear, setClassYear] = useState<string | null>(null);
  const [subjectCounts, setSubjectCounts] = useState<Record<string, number>>({});

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

    fetchUserData();
    fetchQuestionCounts();
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
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Éclat Logo" className="h-10 w-auto cursor-pointer" onClick={() => navigate("/")} />
            <div className="flex items-center gap-2 px-3 py-1 bg-accent-light rounded-full">
              <Flame className="text-accent" size={16} />
              <span className="text-sm font-semibold text-accent">5-day streak!</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <Button variant="ghost" size="icon">
              <Settings size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={signOut}>
              <LogOut size={20} />
            </Button>
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

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up">
          <Card className="border-2 hover:shadow-hover transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total Questions</p>
                  <p className="text-3xl font-bold text-primary">847</p>
                </div>
                <Target className="text-primary" size={32} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:shadow-hover transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Average Score</p>
                  <p className="text-3xl font-bold text-accent">78%</p>
                </div>
                <TrendingUp className="text-accent" size={32} />
              </div>
            </CardContent>
          </Card>
          <Card className="border-2 hover:shadow-hover transition-all">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Rank This Month</p>
                  <p className="text-3xl font-bold text-primary">#12</p>
                </div>
                <Trophy className="text-accent" size={32} />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Practice Section */}
            <Card className="border-2 animate-scale-in">
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
                        className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-primary hover:shadow-soft transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{subject.icon}</span>
                          <div>
                            <h4 className="font-semibold text-foreground">{subject.name}</h4>
                            <p className="text-sm text-muted-foreground">{subject.questions} questions</p>
                          </div>
                        </div>
                         <div className="flex items-center gap-3">
                           <span className="text-xs px-2 py-1 rounded-full bg-primary-light text-primary font-medium">
                             {subject.difficulty}
                           </span>
                           <Button 
                             variant="hero" 
                             size="sm" 
                             onClick={() => navigate(`/quiz?subject=${encodeURIComponent(subject.name)}`)}
                           >
                             Start Practice
                           </Button>
                         </div>
                      </div>
                    ))}
                  </TabsContent>
                  <TabsContent value="topic" className="space-y-3">
                    {topics.map((topic, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-primary hover:shadow-soft transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{topic.icon}</span>
                          <div>
                            <h4 className="font-semibold text-foreground">{topic.name}</h4>
                            <p className="text-sm text-muted-foreground">{topic.subject} • {topic.questions} questions</p>
                          </div>
                        </div>
                        <Button variant="hero" size="sm" onClick={() => navigate("/quiz")}>Start Practice</Button>
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

            {/* Progress Report */}
            <div className="animate-scale-in" style={{ animationDelay: "0.2s" }}>
              <ProgressReport />
            </div>

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
                        className={`flex items-center gap-2 p-2 rounded border ${
                          badge.earned ? "bg-accent-light border-accent" : "bg-muted border-border opacity-50"
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
