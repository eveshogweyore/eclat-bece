import { useState, useMemo } from "react";
import { ChartColumnBig, BarChart3, TrendingUp, Award, Download, AlertTriangle, CheckCircle2, BookOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { SchoolDataState } from "@/components/school/SchoolDataState";
import { ClassAnalyticsDialog } from "@/components/ClassAnalyticsDialog";
import { CurriculumWeaknessHeatmap } from "@/components/school/CurriculumWeaknessHeatmap";
import { SchoolAssignPracticeDialog } from "@/components/school/SchoolAssignPracticeDialog";
import { useSchoolData } from "@/hooks/useSchoolData";
import { toast } from "sonner";

export function SchoolReportsPage() {
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "cohorts">("overview");
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [analyticsCohort, setAnalyticsCohort] = useState<"Year 9 (BECE)" | "Year 6 (Common Entrance)">("Year 9 (BECE)");

  // Focus drill assignment from heatmap
  const [assignFocusDialogOpen, setAssignFocusDialogOpen] = useState(false);
  const [focusConfig, setFocusConfig] = useState<{
    subject: string;
    topic: string;
    cohort: "year_6" | "year_9";
  }>({
    subject: "Mathematics",
    topic: "Algebra",
    cohort: "year_9",
  });

  const { school, students, topicMastery, cohortAverages, assignmentStats, quizScores, refresh, isLoading, error } = useSchoolData();

  // Real CSV Export
  const handleExportCSV = () => {
    if (students.length === 0) {
      toast.error("No student records available to export");
      return;
    }

    // Neutralize spreadsheet formula injection: a cell starting with =,+,-,@
    // would execute as a formula when opened in Excel/Sheets.
    const csvSafe = (value: string) => {
      const escaped = value.replace(/"/g, '""');
      return `"${/^[=+\-@\t\r]/.test(escaped) ? `'${escaped}` : escaped}"`;
    };

    const headers = [
      "Student Name",
      "Username",
      "Unique ID",
      "Cohort",
      "Status",
      "Lifetime EP",
      "Current Level",
      "Weekly EP",
      "Current Streak",
      "Quizzes Taken",
      "Average Score (%)",
      "Mastered Topics",
      "Weak Topics",
      "Mastery (%)",
    ];

    const rows = students.map((s) => [
      csvSafe(s.name),
      csvSafe(s.username),
      csvSafe(s.unique_id || ""),
      csvSafe(s.class_year === "year_9" ? "Year 9 (BECE)" : s.class_year === "year_6" ? "Year 6 (Common Entrance)" : "Unassigned"),
      csvSafe(s.status),
      s.lifetime_ep || 0,
      s.current_level || 1,
      s.weekly_ep || 0,
      s.current_streak || 0,
      s.quizCount || 0,
      s.avgScore || 0,
      s.mastered_topics_count || 0,
      s.weak_topics_count || 0,
      `${s.mastery_percentage || 0}%`,
    ]);

    // BOM keeps Excel on UTF-8 for non-ASCII names.
    const csvContent = `\uFEFF${[headers.join(","), ...rows.map((r) => r.join(","))].join("\n")}`;
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const schoolNameSlug = (school?.school_name || "school").toLowerCase().replace(/[^a-z0-9]/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    link.setAttribute("href", url);
    link.setAttribute("download", `${schoolNameSlug}_performance_report_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    toast.success("School performance report downloaded successfully!");
  };

  // Subject proficiencies come from real mastery records; the core four are
  // listed (at 0) only when no mastery data exists yet — never fabricated
  // from the school-wide average.
  const subjectProficiencies = useMemo(() => {
    const masterySubjects = [...new Set(topicMastery.map((m) => m.subject))];
    const subjects = masterySubjects.length > 0
      ? masterySubjects
      : ["Mathematics", "English Language", "Basic Science", "Social Studies"];
    return subjects.map((sub) => {
      const records = topicMastery.filter((m) => m.subject.toLowerCase() === sub.toLowerCase());
      const score = records.length > 0
        ? Math.round(records.reduce((acc, m) => acc + m.rolling_accuracy, 0) / records.length)
        : 0;

      return {
        subject: sub,
        score,
        target: 75,
        testedCount: records.length,
      };
    });
  }, [topicMastery]);

  // Dynamic BECE Readiness Index
  const beceReadiness = useMemo(() => {
    const y9 = students.filter((s) => s.class_year === "year_9");
    const tested = y9.filter((s) => s.quizCount > 0);
    const distinctionCandidates = tested.filter((s) => s.avgScore >= 70);
    const distinctionRate = tested.length > 0
      ? Math.round((distinctionCandidates.length / tested.length) * 100)
      : (cohortAverages.year_9 >= 70 ? cohortAverages.year_9 : 0);

    const interventionsNeeded = y9.filter((s) => (s.quizCount > 0 && s.avgScore < 50) || s.weak_topics_count > 2).length;

    return {
      totalCandidates: y9.length,
      testedCandidates: tested.length,
      distinctionRate,
      interventionsNeeded,
    };
  }, [students, cohortAverages.year_9]);

  // Cohort breakdown
  const year9Students = useMemo(() => students.filter((s) => s.class_year === "year_9"), [students]);
  const year6Students = useMemo(() => students.filter((s) => s.class_year === "year_6"), [students]);
  const year9Quizzes = useMemo(() => year9Students.reduce((acc, s) => acc + s.quizCount, 0), [year9Students]);
  const year6Quizzes = useMemo(() => year6Students.reduce((acc, s) => acc + s.quizCount, 0), [year6Students]);

  const analyticsStudents = useMemo(() => {
    return students
      .filter((s) => analyticsCohort === "Year 9 (BECE)" ? s.class_year === "year_9" : s.class_year === "year_6")
      .map((s) => ({
        id: s.id,
        name: s.name,
        avatar: s.avatar || "🎓",
      }));
  }, [students, analyticsCohort]);

  if (isLoading) {
    return <SchoolDataState loading />;
  }
  if (error) {
    return <SchoolDataState error={error} onRetry={refresh} />;
  }

  return (
    <>
      <SchoolPageHeader
        title="Reports & Analytics"
        subtitle="Track institutional performance, subject proficiencies, and cohort benchmarks."
        actions={
          <>
            <Button
              variant="outline"
              onClick={handleExportCSV}
              className="text-xs sm:text-sm"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export CSV
            </Button>
            <Button
              onClick={() => {
                setAnalyticsCohort("Year 9 (BECE)");
                setAnalyticsOpen(true);
              }}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm shadow-sm"
            >
              <ChartColumnBig className="mr-1.5 h-4 w-4" />
              Detailed analytics
            </Button>
          </>
        }
      />
      {/* Tab Navigation */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-3 text-xs">
        {[
          { key: "overview", label: "Executive Overview" },
          { key: "subjects", label: "Curriculum Topic Heatmap" },
          { key: "cohorts", label: "Cohort Comparisons" },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key as any)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activeTab === tab.key
                ? "bg-primary text-primary-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        {[
          {
            label: "Institutional Average",
            value: cohortAverages.overall > 0 ? `${cohortAverages.overall}%` : "—",
            hint: "Across all tested students",
            tone: "text-sky-600 dark:text-[#66d7ff]",
          },
          {
            label: "Year 9 BECE Benchmark",
            value: cohortAverages.year_9 > 0 ? `${cohortAverages.year_9}%` : "—",
            hint: `${year9Students.length} candidates enrolled`,
            tone: "text-emerald-600 dark:text-[#48d7b7]",
          },
          {
            label: "Year 6 CE Benchmark",
            value: cohortAverages.year_6 > 0 ? `${cohortAverages.year_6}%` : "—",
            hint: `${year6Students.length} candidates enrolled`,
            tone: "text-purple-600 dark:text-[#c4a9ff]",
          },
          {
            label: "Task Completion Rate",
            value: `${assignmentStats.completionRate}%`,
            hint: `${assignmentStats.completed} of ${assignmentStats.total} completed`,
            tone: "text-amber-600 dark:text-[#ffca6a]",
          },
        ].map((item) => (
          <Card key={item.label} className="border-border bg-card text-card-foreground min-w-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
                {item.label}
              </p>
              <p className={`mt-2 text-2xl sm:text-3xl font-black ${item.tone} truncate`}>
                {item.value}
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground truncate">{item.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tab: Executive Overview */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          <Card className="border-border bg-card text-card-foreground min-w-0 shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base font-semibold text-foreground dark:text-[#71c9ed]">Subject Proficiencies</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {subjectProficiencies.map((sub) => (
                <div key={sub.subject} className="space-y-1.5">
                  <div className="flex justify-between text-xs sm:text-sm">
                    <span className="text-foreground">{sub.subject}</span>
                    <span className="font-bold text-foreground">
                      {sub.score > 0 ? `${sub.score}%` : "—"}{" "}
                      <span className="text-muted-foreground text-xs font-normal">(Target: {sub.target}%)</span>
                    </span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-sky-500 to-cyan-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(sub.score, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border bg-card text-card-foreground min-w-0 shadow-sm">
            <CardHeader className="border-b border-border pb-3">
              <CardTitle className="text-base font-semibold text-foreground dark:text-[#71c9ed]">BECE Readiness Index</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="rounded-xl border border-sky-500/20 bg-sky-500/5 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-sky-700 dark:text-sky-300 font-semibold uppercase tracking-wider">Projected Distinction Rate</span>
                  <span className="text-xl font-black text-sky-600 dark:text-sky-400">
                    {beceReadiness.distinctionRate > 0 ? `${beceReadiness.distinctionRate}%` : "—"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Based on mock exams, drills, and curriculum mastery,{" "}
                  {beceReadiness.distinctionRate > 0 ? (
                    <>
                      <strong className="text-foreground">{beceReadiness.distinctionRate}%</strong> of candidates in
                      Year 9 are trending toward distinction and credit grades in core subjects.
                    </>
                  ) : (
                    <>no Year 9 candidates are trending toward distinction yet — quiz and mock-exam results will build this outlook.</>
                  )}
                </p>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-muted/40 text-xs">
                <span className="text-foreground">Target interventions recommended:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">
                  {beceReadiness.interventionsNeeded} {beceReadiness.interventionsNeeded === 1 ? "learner" : "learners"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab: Curriculum Topic Heatmap */}
      {activeTab === "subjects" && (
        <div className="space-y-4">
          <CurriculumWeaknessHeatmap
            topicMastery={topicMastery}
            students={students.map((s) => ({ id: s.id, name: s.name, class_year: s.class_year }))}
            onAssignFocusPractice={(subject, topic, cohort) => {
              setFocusConfig({ subject, topic, cohort });
              setAssignFocusDialogOpen(true);
            }}
          />
        </div>
      )}

      {/* Tab: Cohort Comparisons */}
      {activeTab === "cohorts" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="border-border bg-card text-card-foreground min-w-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground dark:text-[#71c9ed]">Year 9 (BECE Cohort)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
              <div className="flex justify-between border-b border-border pb-2">
                <span>Enrolled Candidates:</span>
                <span className="font-bold text-foreground">{year9Students.length}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Completed Quizzes & Drills:</span>
                <span className="font-bold text-sky-600 dark:text-[#58c4e8]">{year9Quizzes} sessions</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Active Learners:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {year9Students.filter((s) => s.quizCount > 0 || s.lifetime_ep > 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Benchmark Score:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {cohortAverages.year_9 > 0 ? `${cohortAverages.year_9}%` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border bg-card text-card-foreground min-w-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-foreground dark:text-[#71c9ed]">Year 6 (Common Entrance)</CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-3 text-xs text-muted-foreground">
              <div className="flex justify-between border-b border-border pb-2">
                <span>Enrolled Candidates:</span>
                <span className="font-bold text-foreground">{year6Students.length}</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Completed Quizzes & Drills:</span>
                <span className="font-bold text-sky-600 dark:text-[#58c4e8]">{year6Quizzes} sessions</span>
              </div>
              <div className="flex justify-between border-b border-border pb-2">
                <span>Active Learners:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {year6Students.filter((s) => s.quizCount > 0 || s.lifetime_ep > 0).length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Benchmark Score:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {cohortAverages.year_6 > 0 ? `${cohortAverages.year_6}%` : "—"}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Class Analytics Modal */}
      <ClassAnalyticsDialog
        open={analyticsOpen}
        onOpenChange={setAnalyticsOpen}
        className={analyticsCohort}
        students={analyticsStudents}
        quizResults={quizScores}
      />

      {/* Assign Focus Practice Modal */}
      {school?.id && (
        <SchoolAssignPracticeDialog
          open={assignFocusDialogOpen}
          onOpenChange={setAssignFocusDialogOpen}
          schoolId={school.id}
          defaultCohort={focusConfig.cohort}
          initialSubject={focusConfig.subject}
          initialTopic={focusConfig.topic}
          students={students.map((s) => ({ id: s.id, name: s.name, class_year: s.class_year }))}
          onSuccess={() => {
            refresh();
            toast.success(`Targeted drill assigned for ${focusConfig.topic}!`);
          }}
        />
      )}
    </>
  );
}

export default SchoolReportsPage;
