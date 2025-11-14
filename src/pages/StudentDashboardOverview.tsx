import { useState, useEffect } from "react";
import { BookOpen, ClipboardList, TrendingUp, Trophy, Target, ArrowRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";

interface QuizResult {
  id: string;
  subject: string;
  score: number;
  total_questions: number;
  completed_at: string;
}

export default function StudentDashboardOverview() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [userName, setUserName] = useState("Student");
  const [classYear, setClassYear] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<QuizResult[]>([]);
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;
      
      const { data: profileData } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      
      if (profileData?.full_name) {
        const firstName = profileData.full_name.split(" ")[0];
        setUserName(firstName);
      }

      const { data: studentData } = await supabase
        .from("students")
        .select("id, class_year")
        .eq("user_id", user.id)
        .single();
      
      if (studentData) {
        if (studentData.class_year) {
          setClassYear(studentData.class_year);
        }
        setStudentId(studentData.id);
        
        // Fetch recent quiz results
        const { data: quizResults } = await supabase
          .from("quiz_results")
          .select("id, subject, score, total_questions, completed_at")
          .eq("student_id", studentData.id)
          .order("completed_at", { ascending: false })
          .limit(3);
        
        if (quizResults) {
          setRecentActivity(quizResults);
        }
      }
    };

    fetchUserData();
  }, [user]);

  const featureCards = [
    {
      title: "Start Practice",
      description: "Practice by subject or topic",
      icon: BookOpen,
      color: "text-primary",
      bgColor: "bg-primary/10",
      url: "/dashboard/student/practice",
      badge: "4 Subjects",
    },
    {
      title: "View Assignments",
      description: "Check your practice assignments",
      icon: ClipboardList,
      color: "text-accent",
      bgColor: "bg-accent/10",
      url: "/dashboard/student/assignments",
      badge: "3 Pending",
    },
    {
      title: "Check Progress",
      description: "View your performance analytics",
      icon: TrendingUp,
      color: "text-green-600",
      bgColor: "bg-green-500/10",
      url: "/dashboard/student/progress",
      badge: "+12% This Week",
    },
    {
      title: "See Rankings",
      description: "National leaderboard positions",
      icon: Trophy,
      color: "text-yellow-600",
      bgColor: "bg-yellow-500/10",
      url: "/dashboard/student/leaderboard",
      badge: "Rank #12",
    },
  ];

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Welcome Section */}
      <div className="mb-12 animate-fade-in">
        <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back, {userName}! 🎉</h2>
        {classYear && (
          <p className="text-lg font-semibold text-primary mb-2">
            {classYear === 'year_6' ? 'Year 6 • Common Entrance' : 'Year 9 • BECE'}
          </p>
        )}
        <p className="text-muted-foreground">Ready to ace your exams? You're 2 ranks away from Top 10 nationally!</p>
      </div>

      <Separator className="my-8 opacity-10" />

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-slide-up">
        <Card className="bg-gradient-to-br from-primary-light/30 to-primary-light/10 border-primary-light/40 shadow-soft hover:shadow-hover transition-all">
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
        <Card className="bg-gradient-to-br from-accent-light/30 to-accent-light/10 border-accent-light/40 shadow-soft hover:shadow-hover transition-all">
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
        <Card className="bg-gradient-to-br from-primary-light/20 to-background border-primary-light/30 shadow-soft hover:shadow-hover transition-all">
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

      <Separator className="my-10 opacity-[0.07]" />

      {/* Feature Cards */}
      <div className="mb-12">
        <h3 className="text-2xl font-bold text-foreground mb-6">Quick Access</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {featureCards.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card
                key={index}
                className="bg-gradient-to-br from-card to-muted/20 border-border/50 shadow-soft hover:shadow-hover hover:scale-[1.02] transition-all cursor-pointer group animate-scale-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => navigate(feature.url)}
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className={`p-3 rounded-lg ${feature.bgColor} mb-4`}>
                      <Icon className={feature.color} size={28} />
                    </div>
                    <span className="text-xs px-3 py-1 rounded-full bg-primary-light text-primary font-medium">
                      {feature.badge}
                    </span>
                  </div>
                  <CardTitle className="flex items-center justify-between">
                    {feature.title}
                    <ArrowRight className="text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all" size={20} />
                  </CardTitle>
                  <CardDescription>{feature.description}</CardDescription>
                </CardHeader>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator className="my-10 opacity-[0.07]" />

      {/* Recent Activity */}
      <Card className="bg-gradient-to-br from-card to-background border-border/50 shadow-soft animate-fade-in">
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
          <CardDescription>Your latest quiz results</CardDescription>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">No quiz activity yet. Start practicing to see your results here!</p>
              <Button 
                onClick={() => navigate("/dashboard/student/practice")} 
                className="mt-4"
              >
                Start Practice
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity) => (
                <div key={activity.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 hover:shadow-soft transition-all">
                  <div>
                    <h4 className="font-semibold text-foreground">{activity.subject}</h4>
                    <p className="text-sm text-muted-foreground">
                      {activity.total_questions} questions • {formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-primary">{Math.round(activity.score)}%</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
