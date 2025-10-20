import { Users, TrendingUp, BookOpen, Plus, FileText, LogOut, Settings } from "lucide-react";
import { CompetitionLeaderboards } from "@/components/CompetitionLeaderboards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";

export default function ParentDashboard() {
  const navigate = useNavigate();

  const children = [
    {
      name: "Ada",
      class: "Class 5",
      avgScore: 78,
      progress: 68,
      avatar: "👧",
      recentActivity: [
        "Completed 10 English questions today",
        "Scored 85% on Mathematics quiz",
        "Earned 'Quiz Master' badge",
      ],
      weakAreas: ["Algebra", "Grammar"],
    },
    {
      name: "Kola",
      class: "Class 8",
      avgScore: 82,
      progress: 75,
      avatar: "👦",
      recentActivity: [
        "Completed 15 Science questions today",
        "Ranked #8 in class leaderboard",
        "5-day practice streak!",
      ],
      weakAreas: ["Data Interpretation"],
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Éclat Parent Portal</h1>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <Settings size={20} />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => navigate("/")}>
              <LogOut size={20} />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Welcome Section */}
        <div className="mb-8 animate-fade-in">
          <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back! 👋</h2>
          <p className="text-muted-foreground">Track your children's learning progress and support their growth</p>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-3 mb-8 animate-slide-up">
          <Button variant="hero">
            <Plus size={18} />
            Add Child
          </Button>
          <Button variant="outline">
            <FileText size={18} />
            View All Reports
          </Button>
        </div>

        {/* Children Overview */}
        <div className="space-y-6">
          {children.map((child, index) => (
            <Card
              key={index}
              className="border-2 hover:shadow-hover transition-all animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center text-3xl">
                      {child.avatar}
                    </div>
                    <div>
                      <CardTitle className="text-2xl">{child.name}</CardTitle>
                      <CardDescription className="text-base">{child.class}</CardDescription>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm">
                      View Report
                    </Button>
                    <Button variant="hero" size="sm">
                      Assign Practice
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-6">
                  {/* Stats */}
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3">Performance</h4>
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Average Score</span>
                          <span className="font-bold text-primary">{child.avgScore}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-hero"
                            style={{ width: `${child.avgScore}%` }}
                          ></div>
                        </div>
                      </div>
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Progress</span>
                          <span className="font-bold text-accent">{child.progress}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-accent"
                            style={{ width: `${child.progress}%` }}
                          ></div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3">Recent Activity</h4>
                    <ul className="space-y-2">
                      {child.recentActivity.map((activity, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <span className="text-primary mt-1">•</span>
                          <span>{activity}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Weak Areas */}
                  <div>
                    <h4 className="font-semibold text-sm text-muted-foreground mb-3">Needs Improvement</h4>
                    <div className="space-y-2">
                      {child.weakAreas.map((area, idx) => (
                        <div
                          key={idx}
                          className="px-3 py-2 bg-accent-light border border-accent rounded-lg text-sm font-medium"
                        >
                          {area}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Competition Leaderboards - Ward's Position */}
        <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CompetitionLeaderboards 
            showCurrentUserPosition={true}
            currentUserName="Ada"
            currentUserRanks={{ weekly: 45, monthly: 12, annual: 8 }}
          />
        </div>

        {/* Support Section */}
        <Card className="mt-8 border-2 border-primary animate-fade-in" style={{ animationDelay: "0.4s" }}>
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0">
                <BookOpen className="text-primary" size={24} />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-2">Supporting Your Child's Learning</h3>
                <p className="text-muted-foreground mb-4">
                  Regular practice and positive reinforcement help build confidence. Encourage your child to practice
                  daily, even for just 15 minutes!
                </p>
                <Button variant="outline">View Parent Resources</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
