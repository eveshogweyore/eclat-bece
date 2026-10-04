import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Loader2, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { PortalDataState } from "@/components/PortalDataState";
import { formatDistanceToNow } from "date-fns";

interface SubjectRow {
  subject: string;
  avgScore: number;
  quizzes: number;
  lastPlayed: string | null;
}

interface MasteryRow {
  subject: string;
  topic: string;
  rolling_accuracy: number;
  status: string | null;
}

/**
 * Per-subject analytics for the signed-in student, computed from real quiz
 * results and topic-mastery rows. Replaces the old fully-hardcoded mock page.
 */
export default function SubjectAnalytics() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [subjects, setSubjects] = useState<SubjectRow[]>([]);
  const [masteries, setMasteries] = useState<MasteryRow[]>([]);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!user) return;
      try {
        const { data: studentData } = await supabase
          .from("students")
          .select("id")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!studentData?.id) throw new Error("Student profile not found");

        const [resultsRes, masteryRes] = await Promise.all([
          supabase
            .from("quiz_results")
            .select("subject, score, completed_at")
            .eq("student_id", studentData.id)
            .order("completed_at", { ascending: false })
            .limit(5000),
          supabase
            .from("student_topic_mastery")
            .select("subject, topic, rolling_accuracy, status")
            .eq("student_id", studentData.id),
        ]);

        if (resultsRes.error) throw resultsRes.error;
        if (masteryRes.error) throw masteryRes.error;
        if (cancelled) return;

        const quizzes = (resultsRes.data ?? []) as Array<{ subject: string; score: number; completed_at: string | null }>;
        const subjectMap = new Map<string, { total: number; count: number; last: string | null }>();
        quizzes.forEach((q) => {
          const current = subjectMap.get(q.subject) || { total: 0, count: 0, last: null as string | null };
          subjectMap.set(q.subject, {
            total: current.total + q.score,
            count: current.count + 1,
            last: current.last ?? q.completed_at,
          });
        });

        setSubjects(
          Array.from(subjectMap.entries())
            .map(([subject, d]) => ({
              subject,
              avgScore: Math.round(d.total / d.count),
              quizzes: d.count,
              lastPlayed: d.last,
            }))
            .sort((a, b) => b.quizzes - a.quizzes)
        );
        setMasteries((masteryRes.data ?? []) as MasteryRow[]);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load subject analytics.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const weakTopics = masteries.filter(
    (m) => m.status === "weak" || Number(m.rolling_accuracy || 0) < 60
  );
  const strongTopics = masteries.filter(
    (m) => m.status === "mastered" || Number(m.rolling_accuracy || 0) >= 80
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/student/progress")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Subject Analytics</h1>
          <p className="text-muted-foreground text-sm">Your performance per subject, from real quiz results.</p>
        </div>
      </div>

      {loading ? (
        <PortalDataState loading />
      ) : error ? (
        <PortalDataState error={error} onRetry={() => navigate(0)} />
      ) : subjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
            <BookOpen className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No quiz results yet</p>
            <p className="text-sm text-muted-foreground">
              Complete a practice quiz to see your per-subject analytics here.
            </p>
            <Button size="sm" onClick={() => navigate("/dashboard/student/practice")}>
              Start practicing
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="space-y-3">
            {subjects.map((s) => (
              <Card key={s.subject}>
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <TrendingUp className="h-4 w-4 text-primary shrink-0" />
                      <span className="font-bold text-sm truncate">{s.subject}</span>
                    </div>
                    <span className="text-lg font-black text-primary">{s.avgScore}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full bg-primary transition-all"
                      style={{ width: `${Math.min(100, s.avgScore)}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center justify-between text-[11px] text-muted-foreground">
                    <span>{s.quizzes} quiz{s.quizzes === 1 ? "" : "zes"} taken</span>
                    {s.lastPlayed && <span>Last played {formatDistanceToNow(new Date(s.lastPlayed), { addSuffix: true })}</span>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {(strongTopics.length > 0 || weakTopics.length > 0) && (
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-emerald-600 dark:text-emerald-400">Strong Topics</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {strongTopics.length === 0 ? (
                    <p className="text-xs text-muted-foreground">None yet — keep practicing.</p>
                  ) : (
                    strongTopics.map((m, i) => (
                      <span key={`${m.subject}-${m.topic}-${i}`} className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-medium text-emerald-700 dark:text-emerald-400">
                        {m.topic} · {Math.round(Number(m.rolling_accuracy || 0))}%
                      </span>
                    ))
                  )}
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-bold text-amber-600 dark:text-amber-400">Needs Work</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-1.5">
                  {weakTopics.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nothing flagged — great work!</p>
                  ) : (
                    weakTopics.map((m, i) => (
                      <span key={`${m.subject}-${m.topic}-${i}`} className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                        {m.topic} · {Math.round(Number(m.rolling_accuracy || 0))}%
                      </span>
                    ))
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}
    </div>
  );
}
