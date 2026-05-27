import { School, Users, TrendingUp, AlertCircle, FileDown, Plus, LogOut, Settings, Trophy } from "lucide-react";
import { CompetitionLeaderboards } from "@/components/CompetitionLeaderboards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { ClassAnalyticsDialog } from "@/components/ClassAnalyticsDialog";
import { useTheme } from "next-themes";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

export default function SchoolDashboard() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { theme } = useTheme();
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<{ name: string; class: string } | null>(null);
  
  const logo = theme === "dark" ? logoLight : logoDark;

  const overviewStats = {
    totalClasses: 12,
    totalStudents: 342,
    avgScore: 76,
    atRisk: 23,
  };

  const classes = [
    {
      name: "JSS 3A",
      students: 28,
      avgScore: 72,
      teacher: "Mrs. Adebayo",
      subjects: ["Mathematics", "English", "Basic Science", "Social Studies"],
    },
    {
      name: "JSS 3B",
      students: 30,
      avgScore: 78,
      teacher: "Mr. Okonkwo",
      subjects: ["Mathematics", "English", "Basic Science", "Social Studies"],
    },
    {
      name: "JSS 3C",
      students: 32,
      avgScore: 85,
      teacher: "Dr. Ibrahim",
      subjects: ["Mathematics", "English", "Basic Science", "Social Studies"],
    },
  ];

  const classStudents = [
    { name: "Chidinma Okafor", score: 82, progress: 68, rank: 8, avatar: "👧" },
    { name: "Ibrahim Musa", score: 88, progress: 80, rank: 3, avatar: "👦" },
    { name: "Blessing Adeyemi", score: 94, progress: 88, rank: 1, avatar: "👧" },
    { name: "Emeka Nwankwo", score: 75, progress: 55, rank: 12, avatar: "👦" },
  ];

  const topPerformers = [
    { name: "Blessing Adeyemi", class: "JSS 3C", score: 94, avatar: "👧" },
    { name: "Oluwaseun Ajayi", class: "JSS 3B", score: 91, avatar: "👦" },
    { name: "Amina Yusuf", class: "JSS 3C", score: 89, avatar: "👧" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20 dashboard-theme">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <img 
            src={logo} 
            alt="Éclat Logo" 
            className="h-16 w-auto cursor-pointer" 
            onClick={() => navigate("/")}
          />
          <div className="flex items-center gap-4">
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
        {!selectedClass ? (
          <>
            {/* Welcome Section */}
            <div className="mb-8 animate-fade-in">
              <h2 className="text-3xl font-bold text-foreground mb-2">School Dashboard</h2>
              <p className="text-muted-foreground">Monitor exam prep performance and support student success</p>
            </div>

            {/* Overview Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 animate-slide-up">
              <Card className="border-2 hover:shadow-hover transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Classes</p>
                      <p className="text-3xl font-bold text-primary">{overviewStats.totalClasses}</p>
                    </div>
                    <School className="text-primary" size={32} />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-hover transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Students</p>
                      <p className="text-3xl font-bold text-primary">{overviewStats.totalStudents}</p>
                    </div>
                    <Users className="text-primary" size={32} />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-hover transition-all">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Average Score</p>
                      <p className="text-3xl font-bold text-accent">{overviewStats.avgScore}%</p>
                    </div>
                    <TrendingUp className="text-accent" size={32} />
                  </div>
                </CardContent>
              </Card>
              <Card className="border-2 hover:shadow-hover transition-all border-accent">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">At-Risk Students</p>
                      <p className="text-3xl font-bold text-accent">{overviewStats.atRisk}</p>
                    </div>
                    <AlertCircle className="text-accent" size={32} />
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Classes List */}
              <div className="lg:col-span-2">
                <Card className="border-2 animate-scale-in">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Classes</CardTitle>
                        <CardDescription>Manage your classes and students</CardDescription>
                      </div>
                      <Button variant="hero" size="sm">
                        <Plus size={16} />
                        Add Class
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {classes.map((cls, index) => (
                      <div
                        key={index}
                        className="p-4 border-2 rounded-lg hover:border-primary hover:shadow-soft transition-all cursor-pointer"
                        onClick={() => setSelectedClass(cls.name)}
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h4 className="font-bold text-lg">{cls.name}</h4>
                            <p className="text-sm text-muted-foreground">{cls.teacher}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={(e) => {
                              e.stopPropagation();
                              setSelectedClass(cls.name);
                            }}>
                              View Class
                            </Button>
                            <Button variant="default" size="sm" onClick={(e) => {
                              e.stopPropagation();
                              setAnalyticsOpen(true);
                            }}>
                              View Analytics
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <p className="text-sm text-muted-foreground">Students</p>
                            <p className="text-xl font-bold text-primary">{cls.students}</p>
                          </div>
                           <div>
                             <p className="text-sm text-muted-foreground">Avg Score</p>
                             <div className="flex items-center gap-2">
                               <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                                 <div
                                   className="h-full bg-gradient-hero"
                                   style={{ width: `${cls.avgScore}%` }}
                                 ></div>
                               </div>
                               <span className="text-xl font-bold text-accent">{cls.avgScore}%</span>
                             </div>
                           </div>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Promo Code */}
                <Card className="border-2 border-primary animate-scale-in" style={{ animationDelay: "0.1s" }}>
                  <CardHeader>
                    <CardTitle className="text-lg">School Promo Code</CardTitle>
                  </CardHeader>
                  <CardContent>
                     <div className="p-4 bg-primary-light rounded-lg text-center mb-4">
                       <p className="text-sm text-muted-foreground mb-1">Share with students</p>
                       <p className="text-2xl font-bold text-primary tracking-wider">SCHOOL2025</p>
                     </div>
                    <Button variant="outline" className="w-full">Copy Code</Button>
                  </CardContent>
                </Card>

                {/* Top Performers */}
                <Card className="border-2 animate-scale-in" style={{ animationDelay: "0.2s" }}>
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="text-accent" size={20} />
                      Top Performers
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {topPerformers.map((student, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded bg-muted/50">
                        <span className="text-2xl">{student.avatar}</span>
                        <div className="flex-1">
                          <p className="font-semibold text-sm">{student.name}</p>
                          <p className="text-xs text-muted-foreground">{student.class}</p>
                        </div>
                        <span className="text-sm font-bold text-primary">{student.score}</span>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* School-Wide Competition Leaderboards */}
            <div className="mt-8 animate-fade-in" style={{ animationDelay: "0.3s" }}>
              <CompetitionLeaderboards />
            </div>
          </>
        ) : (
          <>
            {/* Class Detail View */}
            <Button variant="ghost" className="mb-6" onClick={() => setSelectedClass(null)}>
              ← Back to Classes
            </Button>

            <div className="mb-8 animate-fade-in">
              <h2 className="text-3xl font-bold text-foreground mb-2">{selectedClass}</h2>
              <p className="text-muted-foreground">Manage students and assignments</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 mb-8 animate-slide-up">
              <Button variant="hero">
                <Plus size={18} />
                Assign Quiz
              </Button>
              <Button variant="outline">
                <FileDown size={18} />
                Export as PDF
              </Button>
              <Button variant="outline">View Report</Button>
            </div>

            {/* Students List */}
            <Card className="border-2 animate-scale-in">
              <CardHeader>
                <CardTitle>Students</CardTitle>
                <CardDescription>Track individual student performance</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {classStudents.map((student, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-4 border-2 rounded-lg hover:border-primary hover:shadow-soft transition-all"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-full bg-primary-light flex items-center justify-center text-2xl">
                          {student.avatar}
                        </div>
                        <div>
                          <h4 className="font-semibold">{student.name}</h4>
                          <p className="text-sm text-muted-foreground">Rank #{student.rank}</p>
                        </div>
                      </div>
                        <div className="flex items-center gap-6">
                         <div>
                           <p className="text-sm text-muted-foreground">Score</p>
                            <p className="text-lg font-bold text-primary">{student.score}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Progress</p>
                            <p className="text-lg font-bold text-accent">{student.progress}%</p>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedStudent({ name: student.name, class: selectedClass || "" });
                              setReportOpen(true);
                            }}
                          >
                            View Details
                          </Button>
                        </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Dialogs */}
      {selectedStudent && (
        <StudentReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          studentName={selectedStudent.name}
          studentClass={selectedStudent.class}
        />
      )}
      <ClassAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        className={selectedClass || ""}
      />
    </div>
  );
}
