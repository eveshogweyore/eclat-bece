import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase,
  CalendarCheck2,
  GraduationCap,
  Plus,
  TrendingUp,
  Users,
  BookOpen,
  Award,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { SchoolDataState } from "@/components/school/SchoolDataState";
import { CreateClassDialog, CreateStudentDialog } from "@/components/school/SchoolCreateDialogs";
import { StatCard } from "./schoolPageShared";
import { useSchoolData } from "@/hooks/useSchoolData";

export function SchoolOverviewPage() {
  const navigate = useNavigate();
  const { school, students, classes, assignmentStats, cohortAverages, gamificationTotals, topicMastery, refresh, isLoading, error } = useSchoolData();
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [classDialogOpen, setClassDialogOpen] = useState(false);

  const totalStudents = students.length;
  const activeStudents = gamificationTotals.activeLearnersCount;
  const avgScore = cohortAverages.overall;

  const statCards = [
    {
      label: "Total students",
      value: totalStudents.toString(),
      hint: "Enrolled learners",
      icon: Users,
      tone: "primary" as const,
    },
    {
      label: "Active learners",
      value: activeStudents.toString(),
      hint: totalStudents > 0 ? `${Math.round((activeStudents / totalStudents) * 100)}% of total` : "Awaiting activity",
      icon: GraduationCap,
      tone: "success" as const,
    },
    {
      label: "Classes",
      value: classes.length.toString(),
      hint: "Active cohorts",
      icon: Briefcase,
      tone: "accent" as const,
    },
    {
      label: "Assignments",
      value: assignmentStats.total.toString(),
      hint: `${assignmentStats.completed} completed (${assignmentStats.completionRate}%)`,
      icon: CalendarCheck2,
      tone: "warning" as const,
    },
    {
      label: "Avg. score",
      value: avgScore > 0 ? `${avgScore}%` : "—",
      hint: "Overall institutional benchmark",
      icon: TrendingUp,
      tone: "primary" as const,
    },
  ];

  // Best performing subject (null until real mastery data exists — no fabrication)
  const topSubjectInfo = useMemo(() => {
    if (topicMastery.length === 0) return null;
    const subjectMap: Record<string, { total: number; count: number }> = {};
    topicMastery.forEach((m) => {
      if (!subjectMap[m.subject]) subjectMap[m.subject] = { total: 0, count: 0 };
      subjectMap[m.subject].total += m.rolling_accuracy;
      subjectMap[m.subject].count += 1;
    });
    let best = { subject: "Mathematics", score: 0 };
    Object.entries(subjectMap).forEach(([sub, data]) => {
      const avg = Math.round(data.total / data.count);
      if (avg > best.score) best = { subject: sub, score: avg };
    });
    return best;
  }, [topicMastery]);

  const topStudents = gamificationTotals.topAchievers.slice(0, 3);
  const medals = ["🥇", "🥈", "🥉"];

  if (isLoading) {
    return <SchoolDataState loading />;
  }
  if (error) {
    return <SchoolDataState error={error} onRetry={refresh} />;
  }

  return (
    <>
      <SchoolPageHeader
        title={`Welcome back${school?.school_name ? `, ${school.school_name}` : ""}! 👋`}
        subtitle="Here's what's happening across your school this week."
        actions={
          <>
            <Button
              variant="outline"
              onClick={() => navigate("/dashboard/school/reports")}
              className="border-border bg-card text-foreground hover:bg-accent h-9 text-xs sm:text-sm font-medium"
            >
              View reports
            </Button>
            <Button
              onClick={() => setStudentDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 h-9 text-xs sm:text-sm font-semibold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add student
            </Button>
            <Button
              onClick={() => navigate("/dashboard/school/assignments")}
              className="bg-sky-500 text-white hover:bg-sky-600 dark:bg-[#3bc2f3] dark:text-[#041c2d] dark:hover:bg-[#6cd8ff] h-9 text-xs sm:text-sm font-semibold"
            >
              <BookOpen className="mr-1.5 h-3.5 w-3.5" />
              Assign practice
            </Button>
          </>
        }
      />
      {/* Stat Cards - Fully Responsive */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 sm:gap-4">
        {statCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </div>

      {/* Main Grid: Overview & Activity */}
      <div className="mt-6 sm:mt-8 grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-4 sm:gap-6">
        <Card className="border border-border bg-card text-card-foreground shadow-sm min-w-0">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground dark:text-[#71c9ed]">Performance Overview</CardTitle>
              <span className="rounded-xl bg-muted px-2.5 py-1 text-[11px] font-semibold text-primary">Real-Time Metrics</span>
            </div>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 space-y-6">
            {[
              {
                label: "Year 9 / JSS 3 (BECE Cohort)",
                value: cohortAverages.year_9,
                color: "bg-[#3bc2f3]",
              },
              {
                label: "Year 6 / Primary 6 (Common Entrance)",
                value: cohortAverages.year_6,
                color: "bg-[#7dd3fc]",
              },
              {
                label: "Overall institutional average",
                value: avgScore,
                color: "bg-[#8b5cf6]",
              },
            ].map((item) => (
              <div key={item.label} className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="text-muted-foreground font-medium">{item.label}</span>
                  <span className="font-bold text-foreground">
                    {item.value > 0 ? `${item.value}%` : "—"}
                  </span>
                </div>
                <div className="h-2.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${item.color}`}
                    style={{ width: `${Math.min(item.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            <div className="pt-2 flex flex-wrap gap-2 text-xs text-muted-foreground">
              <span className="rounded-md border border-border bg-muted/50 px-3 py-1.5 flex items-center gap-1.5 text-foreground font-medium">
                <Sparkles className="h-3.5 w-3.5 text-primary" />
                {topSubjectInfo
                  ? `Top subject: ${topSubjectInfo.subject} (${topSubjectInfo.score > 0 ? `${topSubjectInfo.score}%` : "-"})`
                  : "Top subject: awaiting mastery data"}
              </span>
              <span className="rounded-md border border-border bg-muted/50 px-3 py-1.5">
                Target: 75% curriculum standard
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border bg-card text-card-foreground shadow-sm min-w-0">
          <CardHeader className="border-b border-border pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-bold text-foreground dark:text-[#71c9ed]">Top Student Achievers</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/school/leaderboard")}
                className="text-xs text-primary hover:underline p-0 h-auto font-semibold"
              >
                View all →
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-3 p-4 sm:p-5">
            {topStudents.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground space-y-2">
                <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-muted text-muted-foreground">
                  <Award className="h-5 w-5" />
                </div>
                <p className="font-semibold text-foreground">No student activity recorded yet</p>
                <p className="text-[11px] text-muted-foreground max-w-xs mx-auto">
                  Learners and points will automatically populate as students complete practice quizzes and exams.
                </p>
              </div>
            ) : (
              topStudents.map((st, idx) => (
                <div
                  key={st.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-card hover:bg-accent/40 p-3 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-base flex-shrink-0">
                      {medals[idx] || "⭐"}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm truncate">{st.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {st.class_year === "year_6" ? "Year 6 • Common Entrance" : "Year 9 • BECE"} • {(st.lifetime_ep || 0).toLocaleString()} EP
                      </p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-primary flex-shrink-0">
                    {st.avgScore > 0 ? `${st.avgScore}%` : "—"}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <CreateStudentDialog
        open={studentDialogOpen}
        onOpenChange={setStudentDialogOpen}
        onCreated={() => refresh()}
      />
      <CreateClassDialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
        onCreated={() => refresh()}
      />
    </>
  );
}

export default SchoolOverviewPage;
