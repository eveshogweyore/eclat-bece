import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Award, Clock, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";

interface StudentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentId: string;
  studentName: string;
  studentClass: string;
  avatar?: string;
}

export function StudentReportDialog({ open, onOpenChange, studentId, studentName, studentClass, avatar }: StudentReportDialogProps) {
  const { theme } = useTheme();
  const logo = theme === "dark" ? logoLight : logoDark;
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<{
    avgScore: number;
    totalQuestions: number;
    accuracy: number;
    streak: number;
  } | null>(null);
  const [subjectsData, setSubjectsData] = useState<Array<{
    name: string;
    score: number;
    progress: number;
    trend: "up" | "down";
    questionsCompleted: number;
  }>>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [achievements, setAchievements] = useState<string[]>([]);

  useEffect(() => {
    if (!open) return;

    if (!studentId) {
      // Fallback to mock data if studentId is not provided (e.g. school mock mode)
      setStats({
        avgScore: 81,
        totalQuestions: 680,
        accuracy: 81,
        streak: 7,
      });
      setSubjectsData([
        { name: "Mathematics", score: 85, progress: 85, trend: "up", questionsCompleted: 156 },
        { name: "English Language", score: 78, progress: 78, trend: "up", questionsCompleted: 142 },
        { name: "Basic Science", score: 72, progress: 72, trend: "down", questionsCompleted: 128 },
        { name: "Social Studies", score: 88, progress: 88, trend: "up", questionsCompleted: 134 },
        { name: "Business Studies", score: 80, progress: 80, trend: "up", questionsCompleted: 120 },
      ]);
      setAchievements(["🏆 Quiz Master", "🔥 7-Day Streak", "⭐ Top 10 Performer", "📚 150+ Questions"]);
      setRecommendations([
        "✓ Excellent progress in Mathematics and Social Studies",
        "✓ Consider more practice in Basic Science to improve confidence",
        "✓ Maintain daily practice routine for best results"
      ]);
      return;
    }

    const fetchData = async () => {
      setLoading(true);
      try {
        // 1. Fetch quiz results
        const { data: quizResults, error: quizError } = await supabase
          .from("quiz_results")
          .select("*")
          .eq("student_id", studentId)
          .order("completed_at", { ascending: false });

        if (quizError) throw quizError;

        // 2. Fetch streaks
        const { data: streakData, error: streakError } = await supabase
          .from("student_streaks")
          .select("current_streak")
          .eq("student_id", studentId)
          .maybeSingle();

        if (streakError) {
          console.warn("Error fetching student streak:", streakError);
        }

        const streakVal = streakData?.current_streak ?? 0;

        if (!quizResults || quizResults.length === 0) {
          setStats({
            avgScore: 0,
            totalQuestions: 0,
            accuracy: 0,
            streak: streakVal,
          });
          setSubjectsData([]);
          setAchievements(streakVal > 0 ? [`🔥 ${streakVal}-Day Streak`] : ["🌱 Learning Journey Started"]);
          setRecommendations([
            "✓ Start completing quizzes to see performance reports",
            "✓ Try a practice quiz in any subject to get started",
            "✓ Maintain daily practice routine to build streaks"
          ]);
          setLoading(false);
          return;
        }

        // 3. Process statistics
        const totalQuizzes = quizResults.length;
        const sumScores = quizResults.reduce((acc, q) => acc + q.score, 0);
        const avgScore = Math.round(sumScores / totalQuizzes);

        const totalQuestions = quizResults.reduce((acc, q) => acc + q.total_questions, 0);
        const totalCorrect = quizResults.reduce((acc, q) => acc + q.correct_answers, 0);
        const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

        // 4. Group by subject
        const subjectGroups: Record<string, {
          totalScore: number;
          count: number;
          totalQuestions: number;
          scores: number[];
        }> = {};

        quizResults.forEach((q) => {
          const subName = q.subject.charAt(0).toUpperCase() + q.subject.slice(1);
          if (!subjectGroups[subName]) {
            subjectGroups[subName] = {
              totalScore: 0,
              count: 0,
              totalQuestions: 0,
              scores: [],
            };
          }
          subjectGroups[subName].totalScore += q.score;
          subjectGroups[subName].count += 1;
          subjectGroups[subName].totalQuestions += q.total_questions;
          subjectGroups[subName].scores.push(q.score);
        });

        const parsedSubjects = Object.entries(subjectGroups).map(([name, data]) => {
          const subjectAvg = Math.round(data.totalScore / data.count);
          const latestScore = data.scores[0];
          const trend: "up" | "down" = latestScore >= subjectAvg ? "up" : "down";

          return {
            name,
            score: subjectAvg,
            progress: subjectAvg,
            trend,
            questionsCompleted: data.totalQuestions,
          };
        });

        // 5. Generate Achievements
        const newAchievements: string[] = [];
        if (totalQuizzes >= 5) newAchievements.push("🏆 Quiz Master");
        if (streakVal > 0) newAchievements.push(`🔥 ${streakVal}-Day Streak`);
        if (accuracy >= 80) newAchievements.push("⭐ High Accuracy");
        if (totalQuestions >= 150) newAchievements.push("📚 150+ Questions");
        if (totalQuizzes >= 20) newAchievements.push("🌟 Dedication Scholar");
        if (newAchievements.length === 0) {
          newAchievements.push("🌱 Learning Journey Started");
        }

        // 6. Generate Recommendations
        const newRecommendations: string[] = [];
        const sortedSubjects = [...parsedSubjects].sort((a, b) => b.score - a.score);
        if (sortedSubjects.length > 0) {
          const bestSub = sortedSubjects[0];
          const worstSub = sortedSubjects[sortedSubjects.length - 1];

          newRecommendations.push(`✓ Excellent progress in ${bestSub.name} (${bestSub.score}%)`);
          if (worstSub.score < 75 && bestSub.name !== worstSub.name) {
            newRecommendations.push(`✓ Consider more practice in ${worstSub.name} to improve confidence`);
          } else {
            newRecommendations.push(`✓ Keep practicing all subjects to maintain top performance`);
          }
        }
        newRecommendations.push("✓ Maintain a daily practice routine for best results");

        setStats({
          avgScore,
          totalQuestions,
          accuracy,
          streak: streakVal,
        });
        setSubjectsData(parsedSubjects);
        setAchievements(newAchievements);
        setRecommendations(newRecommendations);

      } catch (err) {
        console.error("Error loading student report data:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, studentId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-4">
            <img src={logo} alt="Éclat Logo" className="h-12 w-auto" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Progress Report</h2>
              <p className="text-muted-foreground">Comprehensive performance overview</p>
            </div>
          </div>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Student Info */}
            <div className="flex items-center gap-4 p-4 bg-primary/10 rounded-lg">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-3xl font-black">
                {avatar || "👤"}
              </div>
              <div>
                <h3 className="text-xl font-bold">{studentName}</h3>
                <p className="text-muted-foreground">{studentClass}</p>
              </div>
            </div>

            {stats && (
              <>
                {/* Overall Statistics */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-primary">{stats.avgScore}%</div>
                      <div className="text-sm text-muted-foreground">Average Score</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-accent">{stats.totalQuestions}</div>
                      <div className="text-sm text-muted-foreground">Questions Completed</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="text-2xl font-bold text-primary">{stats.accuracy}%</div>
                      <div className="text-sm text-muted-foreground">Accuracy</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2">
                        <Award className="text-accent" size={20} />
                        <div className="text-2xl font-bold">{stats.streak}</div>
                      </div>
                      <div className="text-sm text-muted-foreground">Day Streak</div>
                    </CardContent>
                  </Card>
                </div>

                {/* Subject Breakdown */}
                <Card>
                  <CardHeader>
                    <CardTitle>Subject Performance</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {subjectsData.length > 0 ? (
                      subjectsData.map((subject, idx) => (
                        <div key={idx} className="space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{subject.name}</span>
                              {subject.trend === "up" ? (
                                <TrendingUp className="text-primary" size={16} />
                              ) : (
                                <TrendingDown className="text-accent" size={16} />
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge variant="outline" className="gap-1">
                                <Clock size={12} />
                                {subject.questionsCompleted} questions
                              </Badge>
                              <span className="font-bold text-primary">{subject.score}%</span>
                            </div>
                          </div>
                          <Progress value={subject.progress} className="h-2" />
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center py-4">No subject performance data available yet.</p>
                    )}
                  </CardContent>
                </Card>

                {/* Achievements */}
                <Card>
                  <CardHeader>
                    <CardTitle>Recent Achievements</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {achievements.map((ach, idx) => (
                        <Badge key={idx} className="px-3 py-2 text-sm">{ach}</Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Recommendations */}
                <Card className="border-primary bg-primary/5">
                  <CardHeader>
                    <CardTitle className="text-primary">Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm font-medium">
                    {recommendations.map((rec, idx) => (
                      <p key={idx} className="text-foreground">{rec}</p>
                    ))}
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
