import { useState, useMemo } from "react";
import { GraduationCap, Plus, Calendar, Clock, CheckCircle2, ArrowRight, Users, Trash2, BookOpen, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { SchoolDataState } from "@/components/school/SchoolDataState";
import { SchoolConfirmDialog } from "@/components/school/SchoolConfirmDialog";
import { SchoolScheduleExamDialog } from "@/components/school/SchoolScheduleExamDialog";
import { SchoolExamRosterDialog } from "@/components/school/SchoolExamRosterDialog";
import { useSchoolData, SchoolExamItem } from "@/hooks/useSchoolData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SchoolExamsPage() {
  const { school, students, classes, exams, refresh, isLoading, error } = useSchoolData();
  const [filter, setFilter] = useState("all");
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [selectedRosterExam, setSelectedRosterExam] = useState<SchoolExamItem | null>(null);
  const [rosterDialogOpen, setRosterDialogOpen] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  const filteredExams = useMemo(() => {
    return exams.filter((e) => {
      if (filter === "all") return true;
      if (filter === "scheduled") return e.status === "Scheduled";
      if (filter === "completed") return e.status === "Completed";
      return true;
    });
  }, [exams, filter]);

  const scheduledCount = exams.filter((e) => e.status === "Scheduled").length;
  const completedCount = exams.filter((e) => e.status === "Completed").length;

  const confirmDeleteExam = () => {
    if (!deleteTarget) return;
    const { id, title } = deleteTarget;
    setDeleteTarget(null);
    void (async () => {
      setIsDeletingId(id);
      try {
        const { error } = await supabase.from("school_exams").delete().eq("id", id);
        if (error) throw error;
        toast.success("Examination removed from schedule");
        refresh();
      } catch (err: any) {
        console.error("Error deleting exam:", err);
        toast.error(err.message || "Failed to remove examination");
      } finally {
        setIsDeletingId(null);
      }
    })();
  };

  if (isLoading) {
    return <SchoolDataState loading />;
  }
  if (error) {
    return <SchoolDataState error={error} onRetry={refresh} />;
  }

  return (
    <>
      <SchoolPageHeader
        title="Exams & Evaluations"
        subtitle="Schedule formal mock evaluations, track BECE simulations, and review candidate seating."
        actions={
          <Button
            onClick={() => setScheduleDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm"
          >
            <GraduationCap className="mr-1.5 h-4 w-4" />
            Schedule exam
          </Button>
        }
      />
      {/* Filter Tabs */}
      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-border pb-3 text-xs">
        {[
          { key: "all", label: `All Evaluations (${exams.length})` },
          { key: "scheduled", label: `Upcoming (${scheduledCount})` },
          { key: "completed", label: `Past Assessments (${completedCount})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setFilter(tab.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              filter === tab.key
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Exams Grid / Empty State */}
      {exams.length === 0 ? (
        <Card className="border border-dashed border-border bg-card/60 p-12 text-center shadow-sm">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-primary">
              <GraduationCap className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">No Mock Examinations Scheduled</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Schedule formal BECE simulations, choose subject blueprints, and allocate candidate hall seating for your learners.
              </p>
            </div>
            <Button
              onClick={() => setScheduleDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Schedule First Exam
            </Button>
          </CardContent>
        </Card>
      ) : filteredExams.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground shadow-sm">
          No evaluations match this status filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredExams.map((exam) => (
            <Card
              key={exam.id}
              className="border border-border bg-card text-card-foreground min-w-0 hover:border-primary/40 transition-colors flex flex-col justify-between shadow-sm"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-semibold text-primary">
                        {exam.cohort === "year_6" ? "Year 6 (Primary 6)" : "Year 9 (JSS 3)"}
                      </span>
                      <span className="text-muted-foreground">•</span>
                      <span className="text-[11px] text-muted-foreground font-medium">{exam.subject}</span>
                    </div>
                    <h3 className="text-base sm:text-lg font-bold text-foreground mt-1 leading-snug">
                      {exam.title}
                    </h3>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Target: <span className="text-foreground font-medium">{exam.class_name || "School-wide Cohort"}</span>
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold flex-shrink-0 border ${
                      exam.status === "Scheduled"
                        ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
                        : exam.status === "Completed"
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-muted text-muted-foreground border-border"
                    }`}
                  >
                    {exam.status}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-xs text-muted-foreground">
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[10px] text-muted-foreground">Date</p>
                    <p className="font-semibold text-foreground mt-0.5 truncate">{exam.exam_date}</p>
                    {exam.start_time && (
                      <p className="text-[10px] text-muted-foreground mt-0.5">{exam.start_time}</p>
                    )}
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[10px] text-muted-foreground">Duration</p>
                    <p className="font-semibold text-foreground mt-0.5 truncate">{exam.duration_minutes} Mins</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">{exam.question_count} Questions</p>
                  </div>
                  <div className="rounded-lg bg-muted/40 p-2">
                    <p className="text-[10px] text-muted-foreground">Hall Seating</p>
                    <p className="font-semibold text-primary mt-0.5 truncate">
                      {exam.eligibleStudentCount || 0} Candidates
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 mt-0.5">Pass: {exam.passing_score}%</p>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-border/60">
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isDeletingId === exam.id}
                        onClick={() => setDeleteTarget({ id: exam.id, title: exam.title })}
                    className="h-8 px-2 text-xs text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="mr-1 h-3.5 w-3.5" />
                    Cancel
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => {
                      setSelectedRosterExam(exam);
                      setRosterDialogOpen(true);
                    }}
                    className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
                  >
                    <Users className="mr-1.5 h-3.5 w-3.5" />
                    Review Seating Roster
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Schedule Exam Builder Dialog */}
      {school?.id && (
        <SchoolScheduleExamDialog
          open={scheduleDialogOpen}
          onOpenChange={setScheduleDialogOpen}
          schoolId={school.id}
          classes={classes}
          onCreated={() => refresh()}
        />
      )}

      {/* Candidate Seating Roster Dialog */}
      <SchoolExamRosterDialog
        open={rosterDialogOpen}
        onOpenChange={setRosterDialogOpen}
        exam={selectedRosterExam}
        students={students}
        classes={classes}
      />
      <SchoolConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Cancel and delete "${deleteTarget?.title}"?`}
        description="The examination will be removed from the schedule. This action cannot be undone."
        onConfirm={confirmDeleteExam}
      />
    </>
  );
}

export default SchoolExamsPage;
