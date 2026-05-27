import { TrendingUp, Loader2, BookOpen } from "lucide-react";
import { ProgressReport } from "@/components/ProgressReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function StudentProgressPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  
  // Computed analytics
  const [totalQuestionsCompleted, setTotalQuestionsCompleted] = useState(0);
  const [questionsThisWeek, setQuestionsThisWeek] = useState(0);
  const [overallAccuracy, setOverallAccuracy] = useState(0);
  const [averageScore, setAverageScore] = useState(0);
  const [subjectProgress, setSubjectProgress] = useState<any[]>([]);
  const [sessionHistory, setSessionHistory] = useState<number[]>([]);
  const [sessionImprovement, setSessionImprovement] = useState<string>("↑ 0%");
  const [badges, setBadges] = useState<any[]>([]);
  const [strengths, setStrengths] = useState<string>("");
  const [weaknesses, setWeaknesses] = useState<string>("");
  const [studyAnalytics, setStudyAnalytics] = useState<any>({
    streak: 0,
    hours: 0,
    gain: 0,
    consistency: 0
  });

  useEffect(() => {
    const fetchProgressData = async () => {
      if (!user) return;

      try {
        setLoading(true);

        // 1. Fetch student data
        const { data: studentData, error: studentError } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (studentError || !studentData) {
          throw new Error("Student profile not found.");
        }

        const studentId = studentData.id;

        // 2. Fetch quiz results
        const { data: quizResults, error: quizError } = await supabase
          .from("quiz_results")
          .select("*")
          .eq("student_id", studentId)
          .order("completed_at", { ascending: false });

        if (quizError) throw quizError;

        // 3. Fetch streak data
        const { data: streakData } = await supabase
          .from("student_streaks")
          .select("*")
          .eq("student_id", studentId)
          .maybeSingle();

        const currentStreak = streakData?.current_streak || 0;
        const longestStreak = streakData?.longest_streak || 0;

        if (!quizResults || quizResults.length === 0) {
          // Empty state: handle it gracefully
          setTotalQuestionsCompleted(0);
          setQuestionsThisWeek(0);
          setOverallAccuracy(0);
          setAverageScore(0);
          setSubjectProgress([]);
          setSessionHistory([]);
          setSessionImprovement("↑ 0%");
          setStrengths("No data yet");
          setWeaknesses("No data yet");
          setStudyAnalytics({
            streak: currentStreak,
            hours: 0,
            gain: 0,
            consistency: 0
          });
          setBadges([
            { name: "First Quiz", icon: "🎯", earned: false },
            { name: "10 Quiz Master", icon: "⭐", earned: false },
            { name: "5-Day Streak", icon: "🔥", earned: currentStreak >= 5 },
            { name: "Top 10%", icon: "👑", earned: false },
            { name: "Perfect Score", icon: "💯", earned: false },
            { name: "Week Warrior", icon: "⚡", earned: false },
          ]);
          setLoading(false);
          return;
        }

        // --- CALCULATIONS ---

        // Overall questions and accuracy
        const totalQuestions = quizResults.reduce((sum, q) => sum + q.total_questions, 0);
        const totalCorrect = quizResults.reduce((sum, q) => sum + q.correct_answers, 0);
        const avgScore = quizResults.reduce((sum, q) => sum + q.score, 0) / quizResults.length;
        const accuracy = totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0;

        setTotalQuestionsCompleted(totalQuestions);
        setAverageScore(Math.round(avgScore));
        setOverallAccuracy(Math.round(accuracy));

        // Questions this week
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        const questionsWeek = quizResults
          .filter(q => new Date(q.completed_at) >= oneWeekAgo)
          .reduce((sum, q) => sum + q.total_questions, 0);
        setQuestionsThisWeek(questionsWeek);

        // Subject Breakdown
        const subjectMap = new Map<string, { totalScore: number; correct: number; questions: number; count: number; scores: number[] }>();
        quizResults.forEach(r => {
          const sub = r.subject;
          if (!subjectMap.has(sub)) {
            subjectMap.set(sub, { totalScore: 0, correct: 0, questions: 0, count: 0, scores: [] });
          }
          const curr = subjectMap.get(sub)!;
          curr.totalScore += r.score;
          curr.correct += r.correct_answers;
          curr.questions += r.total_questions;
          curr.count += 1;
          curr.scores.push(r.score);
        });

        const subjectProgressData = Array.from(subjectMap.entries()).map(([subject, data]) => {
          let improvement = 0;
          if (data.scores.length > 1) {
            // scores are desc ordered
            const latest = data.scores[0];
            const oldest = data.scores[data.scores.length - 1];
            improvement = Math.round(latest - oldest);
          } else if (data.scores.length === 1) {
            improvement = Math.round(data.scores[0] - 50);
            if (improvement < 0) improvement = 0;
          }

          return {
            subject,
            currentScore: Math.round(data.totalScore / data.count),
            improvement,
            questionsCompleted: data.questions,
            accuracy: Math.round(data.questions > 0 ? (data.correct / data.questions) * 100 : 0)
          };
        });

        setSubjectProgress(subjectProgressData);

        // Strengths & Weaknesses
        const sortedSubjects = [...subjectProgressData].sort((a, b) => b.currentScore - a.currentScore);
        if (sortedSubjects.length > 0) {
          setStrengths(sortedSubjects[0].subject);
          if (sortedSubjects.length > 1) {
            setWeaknesses(sortedSubjects[sortedSubjects.length - 1].subject);
          } else {
            setWeaknesses("None identified yet");
          }
        }

        // Session History (last 5 quiz scores, chronological order)
        const last5Quizzes = [...quizResults].slice(0, 5).reverse();
        setSessionHistory(last5Quizzes.map(q => q.score));

        // Calculate session improvement
        let sessionImpStr = "↑ 0%";
        if (quizResults.length >= 2) {
          const latestScore = quizResults[0].score;
          const prevScore = quizResults[1].score;
          const diff = latestScore - prevScore;
          if (diff >= 0) {
            sessionImpStr = `↑ ${Math.round(diff)}%`;
          } else {
            sessionImpStr = `↓ ${Math.round(Math.abs(diff))}%`;
          }
        }
        setSessionImprovement(sessionImpStr);

        // Badges calculation
        const firstQuiz = quizResults.length >= 1;
        const tenQuiz = quizResults.length >= 10;
        const streakBadge = longestStreak >= 5;
        const perfectScore = quizResults.some(q => q.score === 100);
        const hasRecentQuiz = quizResults.some(q => new Date(q.completed_at) >= oneWeekAgo);

        // To determine Top 10%
        const now = new Date();
        const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
        const { data: monthlyResults } = await supabase
          .from("quiz_results")
          .select("student_id, score")
          .gte("completed_at", firstDayOfMonth);

        let top10Badge = false;
        if (monthlyResults && monthlyResults.length > 0) {
          const studentScores = new Map<string, number[]>();
          monthlyResults.forEach(r => {
            if (!studentScores.has(r.student_id)) {
              studentScores.set(r.student_id, []);
            }
            studentScores.get(r.student_id)!.push(r.score);
          });
          const studentAverages = Array.from(studentScores.entries()).map(([id, scores]) => ({
            id,
            avg: scores.reduce((sum, score) => sum + score, 0) / scores.length
          }));
          studentAverages.sort((a, b) => b.avg - a.avg);
          const rank = studentAverages.findIndex(s => s.id === studentId) + 1;
          const totalStudents = studentAverages.length;
          top10Badge = rank > 0 && (rank / totalStudents <= 0.1 || rank <= 3);
        } else {
          top10Badge = avgScore >= 85;
        }

        setBadges([
          { name: "First Quiz", icon: "🎯", earned: firstQuiz },
          { name: "10 Quiz Master", icon: "⭐", earned: tenQuiz },
          { name: "5-Day Streak", icon: "🔥", earned: streakBadge || currentStreak >= 5 },
          { name: "Top 10%", icon: "👑", earned: top10Badge },
          { name: "Perfect Score", icon: "💯", earned: perfectScore },
          { name: "Week Warrior", icon: "⚡", earned: hasRecentQuiz },
        ]);

        // Study Analytics
        const totalHours = Math.round((quizResults.length * 10 / 60) * 10) / 10;
        const quizzesAbove70 = quizResults.filter(q => q.score >= 70).length;
        const consistency = quizResults.length > 0 ? Math.round((quizzesAbove70 / quizResults.length) * 100) : 0;

        const oldestQuiz = quizResults[quizResults.length - 1];
        const latestQuiz = quizResults[0];
        const gain = Math.round(latestQuiz.score - oldestQuiz.score);

        setStudyAnalytics({
          streak: currentStreak,
          hours: totalHours,
          gain: gain,
          consistency: consistency
        });

      } catch (err) {
        console.error("Error loading progress data:", err);
        toast.error("Failed to load your progress data.");
      } finally {
        setLoading(false);
      }
    };

    fetchProgressData();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-16 flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading progress analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="mb-8 animate-fade-in">
        <h2 className="text-3xl sm:text-4xl font-black text-foreground tracking-tight flex items-center gap-2">
          <TrendingUp className="text-accent" size={32} />
          Your Progress <span className="text-primary">.</span>
        </h2>
        <p className="text-muted-foreground font-medium text-sm sm:text-base mt-1">Track your performance and improvement</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Progress Report */}
        <div className="lg:col-span-2 animate-scale-in">
          <ProgressReport 
            subjectProgress={subjectProgress}
            totalQuestionsCompleted={totalQuestionsCompleted}
            overallAccuracy={overallAccuracy}
            questionsThisWeek={questionsThisWeek}
            accuracyTrend={sessionImprovement + " compared to last session"}
            strongAreas={strengths}
            weaknessAreas={weaknesses}
            studyAnalytics={studyAnalytics}
          />
        </div>

        {/* Sidebar with Additional Stats */}
        <div className="space-y-6">
          {/* Session History */}
          <Card className="border-2 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden animate-scale-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="flex items-center gap-2 text-lg font-black tracking-tight">
                <TrendingUp className="text-accent" size={20} />
                Session History
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {sessionHistory.length === 0 ? (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  <p>Complete a practice quiz to see history charts.</p>
                  <Button 
                    variant="link" 
                    onClick={() => navigate("/dashboard/student/practice")}
                    className="text-primary font-bold mt-2"
                  >
                    Start practice quiz
                  </Button>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center text-sm mb-4">
                    <span className="text-muted-foreground font-semibold">Last 5 Sessions</span>
                    <span className="font-black text-accent bg-accent/10 px-3 py-1 rounded-lg text-xs">{sessionImprovement}</span>
                  </div>
                  <div className="flex items-end justify-between gap-3 h-28 pt-2">
                    {sessionHistory.map((score, idx) => (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                        <div className="text-[10px] font-black text-muted-foreground mb-1">{score}%</div>
                        <div className="w-full bg-muted rounded-lg overflow-hidden h-full max-h-[80%] flex items-end">
                          <div
                            className="w-full bg-gradient-hero rounded-t-lg"
                            style={{ height: `${score}%`, transition: "all 0.5s ease-out" }}
                          />
                        </div>
                        <div className="text-[10px] font-bold text-muted-foreground/60">S{idx + 1}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Badges */}
          <Card className="border-2 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden animate-scale-in" style={{ animationDelay: "0.2s" }}>
            <CardHeader className="pb-3 border-b border-border/40">
              <CardTitle className="text-lg font-black tracking-tight">Badges Earned</CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="grid grid-cols-2 gap-3">
                {badges.map((badge, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center gap-3 p-3.5 rounded-2xl border transition-all duration-300 ${
                      badge.earned 
                        ? "bg-primary/5 border-primary/20 hover:scale-[1.03]" 
                        : "bg-muted/30 border-border/30 opacity-40"
                    }`}
                  >
                    <span className="text-2xl filter drop-shadow-sm">{badge.icon}</span>
                    <div className="min-w-0">
                      <span className="text-xs font-black text-foreground block truncate leading-tight">{badge.name}</span>
                      <span className="text-[9px] font-black uppercase tracking-wider text-muted-foreground/80">
                        {badge.earned ? "Unlocked" : "Locked"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
