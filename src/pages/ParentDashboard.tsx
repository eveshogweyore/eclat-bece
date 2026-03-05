import { useState, useEffect } from "react";
import { Users, TrendingUp, BookOpen, Plus, FileText, LogOut, Settings, Award, Target } from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { CompetitionLeaderboards } from "@/components/CompetitionLeaderboards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { AssignPracticeDialog } from "@/components/AssignPracticeDialog";
import { DummyPaymentModal } from "@/components/parent/DummyPaymentModal";
import { ParentActivityFeed } from "@/components/parent/ParentActivityFeed";
import { useTheme } from "next-themes";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";

interface LinkedChild {
  id: string;
  user_id: string;
  class_year: string | null;
  is_premium?: boolean;
  profile: {
    full_name: string | null;
    unique_id: string;
  };
}

interface QuizResult {
  id: string;
  subject: string;
  score: number;
  correct_answers: number;
  total_questions: number;
  completed_at: string;
}

interface ChildAnalytics {
  studentId: string;
  averageScore: number;
  totalQuizzes: number;
  subjectPerformance: { subject: string; avgScore: number; count: number }[];
  recentQuizzes: QuizResult[];
}

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { signOut, user } = useAuth();
  const { theme } = useTheme();
  const [reportOpen, setReportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<{ name: string; class: string; avatar: string } | null>(null);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [studentCode, setStudentCode] = useState("");
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [parentUserId, setParentUserId] = useState<string | null>(null);
  const [childrenAnalytics, setChildrenAnalytics] = useState<Map<string, ChildAnalytics>>(new Map());
  const [globalActivities, setGlobalActivities] = useState<QuizResult[]>([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentChild, setSelectedPaymentChild] = useState<{ id: string; name: string } | null>(null);

  const logo = theme === "dark" ? logoLight : logoDark;

  // Derived Top-Level Metrics
  const totalChildren = linkedChildren.length;
  const premiumChildrenCount = linkedChildren.filter(c => c.is_premium).length;

  let totalQuizzesGlobal = 0;
  let totalScoreGlobal = 0;

  childrenAnalytics.forEach(analytics => {
    totalQuizzesGlobal += analytics.totalQuizzes;
    totalScoreGlobal += (analytics.averageScore * analytics.totalQuizzes); // Weighted sum
  });

  const overallAverage = totalQuizzesGlobal > 0 ? Math.round(totalScoreGlobal / totalQuizzesGlobal) : 0;


  useEffect(() => {
    const fetchParentData = async () => {
      if (!user) return;

      try {
        const { data: parentData } = await supabase
          .from("parents")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (parentData) {
          setParentUserId(parentData.id);
          await fetchLinkedChildren(parentData.id);
        }
      } catch (error) {
        console.error("Error fetching parent data:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchParentData();
  }, [user]);

  const fetchLinkedChildren = async (parentId: string) => {
    try {
      const { data, error } = await supabase
        .from("students")
        .select(`
          id,
          user_id,
          class_year,
          is_premium,
          profile:profiles(full_name, unique_id, username)
        `)
        .eq("parent_id", parentId);

      if (error) throw error;

      if (data) {
        setLinkedChildren(data as unknown as LinkedChild[]);
        // Fetch analytics for each child
        data.forEach((child) => {
          fetchChildAnalytics(child.id);
        });
      }
    } catch (error) {
      console.error("Error fetching linked children:", error);
      toast.error("Failed to load linked children");
    }
  };

  const fetchChildAnalytics = async (studentId: string) => {
    try {
      const { data: quizResults, error } = await supabase
        .from("quiz_results")
        .select("*")
        .eq("student_id", studentId)
        .order("completed_at", { ascending: false });

      if (error) throw error;

      if (quizResults && quizResults.length > 0) {
        // Calculate average score
        const averageScore = quizResults.reduce((acc, result) => acc + result.score, 0) / quizResults.length;

        // Calculate subject performance
        const subjectMap = new Map<string, { totalScore: number; count: number }>();
        quizResults.forEach((result) => {
          const existing = subjectMap.get(result.subject) || { totalScore: 0, count: 0 };
          subjectMap.set(result.subject, {
            totalScore: existing.totalScore + result.score,
            count: existing.count + 1,
          });
        });

        const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, data]) => ({
          subject: subject.charAt(0).toUpperCase() + subject.slice(1),
          avgScore: Math.round(data.totalScore / data.count),
          count: data.count,
        }));

        const analytics: ChildAnalytics = {
          studentId,
          averageScore: Math.round(averageScore),
          totalQuizzes: quizResults.length,
          subjectPerformance,
          recentQuizzes: quizResults.slice(0, 5) as QuizResult[],
        };

        setChildrenAnalytics((prev) => new Map(prev).set(studentId, analytics));

        // Add to global activities
        const studentName = linkedChildren.find(c => c.id === studentId)?.profile.full_name || "Unknown";
        const activitiesWithName = quizResults.map(q => ({ ...q, student_name: studentName })) as QuizResult[];

        setGlobalActivities(prev => {
          const combined = [...prev, ...activitiesWithName];
          // Sort by completed_at descending
          return combined.sort((a, b) => new Date(b.completed_at).getTime() - new Date(a.completed_at).getTime()).slice(0, 20); // Keep top 20
        });
      }
    } catch (error) {
      console.error("Error fetching child analytics:", error);
    }
  };

  const [newChildData, setNewChildData] = useState({
    fullName: "",
    classYear: "",
    username: "",
    password: "",
  });
  const [createdChildCredentials, setCreatedChildCredentials] = useState<{ username: string; password: string } | null>(null);

  const handleCreateChild = async () => {
    if (!newChildData.fullName || !newChildData.classYear || !newChildData.username || !newChildData.password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (newChildData.password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    if (!parentUserId) {
      toast.error("Parent profile not found");
      return;
    }

    setIsAddingChild(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("No session found");

      const response = await supabase.functions.invoke("create-student-account", {
        body: newChildData,
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (response.error) {
        toast.error(response.error.message || "Failed to create student account");
        throw new Error(response.error.message);
      }

      toast.success("Student account created successfully!");
      setCreatedChildCredentials({ username: newChildData.username, password: newChildData.password });

      // Refresh linked children list
      await fetchLinkedChildren(parentUserId);
    } catch (error) {
      console.error("Error creating student account:", error);
    } finally {
      setIsAddingChild(false);
    }
  };

  const handleCloseAddChild = () => {
    setAddChildOpen(false);
    setNewChildData({ fullName: "", classYear: "", username: "", password: "" });
    setCreatedChildCredentials(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20">
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
            <NotificationBell />
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
        <div className="mb-8 animate-fade-in flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-3xl font-bold text-foreground mb-2">Welcome back! 👋</h2>
            <p className="text-muted-foreground">Track your children's exam prep progress and support their educational journey</p>
          </div>
          <Button variant="hero" onClick={() => setAddChildOpen(true)}>
            <Plus size={18} className="mr-2" />
            Add Child
          </Button>
        </div>

        {/* Top-Level Overview Metrics */}
        {!isLoading && linkedChildren.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8 animate-slide-up" style={{ animationDelay: "0.1s" }}>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-primary/10 rounded-lg shrink-0">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Children</p>
                  <p className="text-2xl font-bold text-foreground">{totalChildren}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-green-500/10 rounded-lg shrink-0">
                  <TrendingUp className="h-6 w-6 text-green-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Overall Average</p>
                  <p className="text-2xl font-bold text-foreground">{overallAverage}%</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-blue-500/10 rounded-lg shrink-0">
                  <Target className="h-6 w-6 text-blue-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Quizzes</p>
                  <p className="text-2xl font-bold text-foreground">{totalQuizzesGlobal}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border shadow-sm">
              <CardContent className="p-4 flex items-center gap-4">
                <div className="p-3 bg-amber-500/10 rounded-lg shrink-0">
                  <Award className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Premium Status</p>
                  <p className="text-xl font-bold text-foreground">
                    {premiumChildrenCount} <span className="text-sm font-normal text-muted-foreground">/ {totalChildren} Active</span>
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Children Overview */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading your children...</p>
          </div>
        ) : linkedChildren.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="py-20 text-center flex flex-col items-center justify-center bg-gradient-to-b from-card to-muted/20">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mb-6">
                <Users className="h-12 w-12 text-primary" />
              </div>
              <h3 className="text-2xl font-bold mb-3">Welcome to your Parent Portal!</h3>
              <p className="text-muted-foreground mb-8 max-w-md mx-auto text-lg">
                Let's get started by creating an account for your child. Once connected, you can track their progress and assign practice.
              </p>
              <Button size="lg" variant="hero" onClick={() => setAddChildOpen(true)} className="text-lg px-8 py-6 rounded-full shadow-lg hover:shadow-xl hover:-translate-y-1 transition-all">
                <Plus className="mr-2" size={24} />
                Create First Child Account
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column: Children Cards */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-xl font-bold text-foreground">Your Children</h3>
              </div>
              {linkedChildren.map((child, index) => (
                <Card
                  key={child.id}
                  className="border-2 hover:shadow-hover transition-all animate-scale-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-16 w-16 rounded-full bg-gradient-hero flex items-center justify-center text-2xl font-bold text-white shrink-0 shadow-sm">
                          {child.profile.full_name?.charAt(0).toUpperCase() || "?"}
                        </div>
                        <div>
                          <CardTitle className="text-2xl">{child.profile.full_name || "Unknown"}</CardTitle>
                          <CardDescription className="text-base flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                            <span className="inline-flex items-center rounded-md bg-secondary px-2 py-1 text-xs font-medium text-secondary-foreground ring-1 ring-inset ring-secondary/20">
                              {child.class_year === "year_6" ? "Year 6" : child.class_year === "year_9" ? "Year 9" : "No Class"}
                            </span>
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              Code: <span className="font-mono bg-muted px-1.5 py-0.5 rounded">{child.profile.unique_id}</span>
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => {
                            setSelectedChild({
                              name: child.profile.full_name || "Unknown",
                              class: child.class_year === "year_6" ? "Year 6" : "Year 9",
                              avatar: child.profile.full_name?.charAt(0).toUpperCase() || "?"
                            });
                            setReportOpen(true);
                          }}
                        >
                          View Report
                        </Button>
                        <Button
                          variant="hero"
                          size="sm"
                          className="flex-1 sm:flex-none"
                          onClick={() => {
                            setSelectedChild({
                              name: child.profile.full_name || "Unknown",
                              class: child.class_year === "year_6" ? "Year 6" : "Year 9",
                              avatar: child.profile.full_name?.charAt(0).toUpperCase() || "?"
                            });
                            setAssignOpen(true);
                          }}
                        >
                          Assign Practice
                        </Button>
                        {!child.is_premium && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-amber-500 hover:text-amber-600 hover:bg-amber-500/10 w-full sm:w-auto"
                            onClick={() => {
                              setSelectedPaymentChild({ id: child.id, name: child.profile.full_name || "Unknown" });
                              setPaymentModalOpen(true);
                            }}
                          >
                            Upgrade Premium
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {childrenAnalytics.has(child.id) ? (
                      <div className="space-y-6 mt-2">
                        {/* Key Stats */}
                        <div className="grid grid-cols-3 gap-4">
                          <div className="p-4 rounded-xl bg-primary-light/50 border border-primary/10 transition-colors hover:bg-primary-light">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Avg Score</p>
                              <Award className="h-4 w-4 text-primary" />
                            </div>
                            <p className="text-3xl font-bold text-foreground">
                              {childrenAnalytics.get(child.id)!.averageScore}%
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-green-500/5 border border-green-500/10 transition-colors hover:bg-green-500/10">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-green-600 uppercase tracking-wider">Quizzes</p>
                              <Target className="h-4 w-4 text-green-600" />
                            </div>
                            <p className="text-3xl font-bold text-foreground">
                              {childrenAnalytics.get(child.id)!.totalQuizzes}
                            </p>
                          </div>
                          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 transition-colors hover:bg-blue-500/10">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-xs font-semibold text-blue-600 uppercase tracking-wider">Subjects</p>
                              <BookOpen className="h-4 w-4 text-blue-600" />
                            </div>
                            <p className="text-3xl font-bold text-foreground">
                              {childrenAnalytics.get(child.id)!.subjectPerformance.length}
                            </p>
                          </div>
                        </div>

                        {/* Subject Performance Chart */}
                        {childrenAnalytics.get(child.id)!.subjectPerformance.length > 0 && (
                          <div className="space-y-3 pt-2">
                            <h4 className="font-semibold text-sm text-foreground flex items-center gap-2">
                              <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                              Subject Performance
                            </h4>
                            <div className="h-[200px] w-full bg-card rounded-xl border p-4 shadow-sm">
                              <ChartContainer
                                config={{
                                  avgScore: {
                                    label: "Average Score",
                                    color: "hsl(var(--primary))",
                                  },
                                }}
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart data={childrenAnalytics.get(child.id)!.subjectPerformance}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
                                    <XAxis
                                      dataKey="subject"
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                      dy={10}
                                    />
                                    <YAxis
                                      axisLine={false}
                                      tickLine={false}
                                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                                      domain={[0, 100]}
                                      dx={-10}
                                    />
                                    <ChartTooltip cursor={{ fill: 'var(--muted)', opacity: 0.4 }} content={<ChartTooltipContent />} />
                                    <Bar
                                      dataKey="avgScore"
                                      fill="hsl(var(--primary))"
                                      radius={[4, 4, 0, 0]}
                                      maxBarSize={40}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartContainer>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-xl border border-dashed mt-4">
                        <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-20" />
                        <p className="font-medium text-foreground mb-1">No quiz data yet</p>
                        <p className="text-sm max-w-sm mx-auto">Analytics will appear here once your child begins taking practice quizzes.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Right Column: Activity Feed & Links */}
            <div className="space-y-6">
              <ParentActivityFeed activities={globalActivities} isLoading={isLoading} />

              {/* Support Section embedded in sidebar */}
              <Card className="border-border shadow-sm overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent pointer-events-none"></div>
                <CardContent className="p-6 relative z-10">
                  <div className="flex flex-col gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-lg transform -rotate-6">
                      <Award className="h-6 w-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg mb-2">Supporting Success</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Consistent practice is key to exam excellence. Review our resources to better support your child.
                      </p>
                      <Button variant="default" className="w-full bg-foreground text-background hover:bg-foreground/90">
                        View Resources
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

      </div>

      <StudentReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        studentName={selectedChild?.name || ""}
        studentClass={selectedChild?.class || ""}
        avatar={selectedChild?.avatar}
      />
      <AssignPracticeDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        childName={selectedChild?.name}
      />

      {/* Add Child Dialog */}
      <Dialog open={addChildOpen} onOpenChange={handleCloseAddChild}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{createdChildCredentials ? "Student Account Created" : "Create Student Account"}</DialogTitle>
            <DialogDescription>
              {createdChildCredentials
                ? "Please save these login credentials. Your child will need them to log in."
                : "Create a new student account for your child."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {createdChildCredentials ? (
              <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
                <div>
                  <Label className="text-muted-foreground text-xs">Username</Label>
                  <p className="font-mono text-lg font-medium">{createdChildCredentials.username}</p>
                </div>
                <div>
                  <Label className="text-muted-foreground text-xs">Password</Label>
                  <p className="font-mono text-lg font-medium">{createdChildCredentials.password}</p>
                </div>
                <Button
                  className="w-full mt-4"
                  variant="hero"
                  onClick={handleCloseAddChild}
                >
                  Done
                </Button>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    placeholder="e.g. Ada Okafor"
                    value={newChildData.fullName}
                    onChange={(e) => setNewChildData({ ...newChildData, fullName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="classYear">Class Year</Label>
                  <select
                    id="classYear"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={newChildData.classYear}
                    onChange={(e) => setNewChildData({ ...newChildData, classYear: e.target.value })}
                  >
                    <option value="" disabled>Select Class Year</option>
                    <option value="year_6">Year 6 (Primary 6)</option>
                    <option value="year_9">Year 9 (JSS 3)</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="username">Student Username</Label>
                  <Input
                    id="username"
                    placeholder="e.g. ada.okafor"
                    value={newChildData.username}
                    onChange={(e) => setNewChildData({ ...newChildData, username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Student Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={newChildData.password}
                    onChange={(e) => setNewChildData({ ...newChildData, password: e.target.value })}
                  />
                </div>
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    onClick={handleCloseAddChild}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="hero"
                    onClick={handleCreateChild}
                    disabled={isAddingChild || !newChildData.fullName || !newChildData.classYear || !newChildData.username || !newChildData.password.trim()}
                    className="flex-1"
                  >
                    {isAddingChild ? "Creating..." : "Create Account"}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {selectedPaymentChild && (
        <DummyPaymentModal
          open={paymentModalOpen}
          onOpenChange={setPaymentModalOpen}
          studentId={selectedPaymentChild.id}
          studentName={selectedPaymentChild.name}
          onSuccess={() => {
            if (parentUserId) fetchLinkedChildren(parentUserId);
          }}
        />
      )}
    </div>
  );
}

