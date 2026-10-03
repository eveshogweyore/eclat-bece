import { useState } from "react";
import { BookOpen, Plus, Calendar, Clock, CheckCircle2, ArrowRight, Check, X, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { SchoolDataState } from "@/components/school/SchoolDataState";
import { SectionHeader } from "./schoolPageShared";
import { SchoolAssignPracticeDialog } from "@/components/school/SchoolAssignPracticeDialog";
import { useSchoolData, SchoolAssignmentItem } from "@/hooks/useSchoolData";

export function SchoolAssignmentsPage() {
  const [assignOpen, setAssignOpen] = useState(false);
  const [selectedSubmissionAssignment, setSelectedSubmissionAssignment] = useState<SchoolAssignmentItem | null>(null);
  const [submissionsOpen, setSubmissionsOpen] = useState(false);

  const { school, students, assignments, assignmentStats, refresh, isLoading, error } = useSchoolData();

  const studentOptions = students.map((s) => ({
    id: s.id,
    name: s.name,
    class_year: s.class_year,
  }));

  const handleOpenSubmissions = (assignment: SchoolAssignmentItem) => {
    setSelectedSubmissionAssignment(assignment);
    setSubmissionsOpen(true);
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
        title="Assignments"
        subtitle="Assign customized practice quizzes and track student completion rates."
        actions={
          <Button
            onClick={() => setAssignOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm shadow-sm"
          >
            <BookOpen className="mr-1.5 h-4 w-4" />
            Assign practice
          </Button>
        }
      />
      {/* Metric Cards Header */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          ["Total Assignments", assignmentStats.total.toString(), "Targeted drills created"],
          ["Completed Tasks", assignmentStats.completed.toString(), `${assignmentStats.completionRate}% completion rate`],
          ["In Progress", assignmentStats.inProgress.toString(), "Pending student submissions"],
          ["Enrolled Learners", students.length.toString(), "Active school roster"],
        ].map(([label, value, hint]) => (
          <Card key={label} className="border-border bg-card text-card-foreground min-w-0 shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
                {label}
              </p>
              <p className="mt-2 text-2xl sm:text-3xl font-black text-foreground truncate">{value}</p>
              <p className="mt-1 text-[11px] text-sky-600 dark:text-[#51c6eb] font-medium truncate">{hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <SectionHeader
        title="Active Assignments"
        subtitle="Quizzes and timed practice sessions assigned to classes and learners"
      />

      {/* Empty State vs Assignments List */}
      {assignments.length === 0 ? (
        <Card className="border border-dashed border-border bg-card/60 p-12 text-center shadow-sm">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-sky-50 text-sky-600 dark:bg-[#162945] dark:text-[#71c9ed]">
              <BookOpen className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">No Assignments Created Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Assign customized practice quizzes to your learners to reinforce weak curriculum topics and track individual submissions.
              </p>
            </div>
            <Button
              onClick={() => setAssignOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Assign First Practice
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {assignments.map((assignment) => {
            const isCompleted = assignment.status === "completed" || assignment.completed_at != null;
            const topicsLabel = assignment.topics.length > 0 ? assignment.topics.join(", ") : "General";

            return (
              <Card
                key={assignment.id}
                className="border-border bg-card text-card-foreground min-w-0 hover:border-primary/40 transition-colors shadow-sm"
              >
                <CardContent className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 sm:p-5">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-base sm:text-lg font-bold text-foreground truncate">
                        {assignment.subject}: {topicsLabel}
                      </p>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                          isCompleted
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                            : assignment.status === "in_progress"
                            ? "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
                            : "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30"
                        }`}
                      >
                        {isCompleted ? "Completed" : assignment.status === "in_progress" ? "In Progress" : "Pending"}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      <span className="text-sky-600 dark:text-[#58c4e8] font-semibold">Assigned to: {assignment.student_name}</span>
                      <span>•</span>
                      <span>{assignment.num_questions} Questions</span>
                      <span>•</span>
                      <span>{assignment.duration} Mins</span>
                      <span>•</span>
                      <span>{new Date(assignment.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenSubmissions(assignment)}
                      className="text-xs"
                    >
                      View submissions
                      <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Assignment Dialog */}
      {school && (
        <SchoolAssignPracticeDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          schoolId={school.id}
          students={studentOptions}
          onSuccess={() => {
            refresh();
          }}
        />
      )}

      {/* View Submissions Dialog */}
      {selectedSubmissionAssignment && (
        <Dialog open={submissionsOpen} onOpenChange={setSubmissionsOpen}>
          <DialogContent className="border-border bg-card text-card-foreground w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
            <DialogHeader>
              <DialogTitle className="text-xl text-foreground">Assignment Submissions</DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {selectedSubmissionAssignment.subject} • {selectedSubmissionAssignment.topics.join(", ") || "General"}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3 text-xs">
              {/* Task Details Summary Card */}
              <div className="rounded-xl border border-border bg-muted/40 p-4 space-y-2 text-foreground">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Questions:</span>
                  <span className="font-semibold text-foreground">{selectedSubmissionAssignment.num_questions}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Time Limit:</span>
                  <span className="font-semibold text-foreground">{selectedSubmissionAssignment.duration} minutes</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Assigned On:</span>
                  <span className="font-semibold text-foreground">
                    {new Date(selectedSubmissionAssignment.created_at).toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Student Submission Card */}
              <div className="rounded-xl border border-border bg-card p-4 space-y-3 shadow-xs">
                <p className="text-[11px] uppercase tracking-wider font-semibold text-muted-foreground">
                  Learner Submission Status
                </p>
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <p className="font-bold text-foreground text-sm">{selectedSubmissionAssignment.student_name}</p>
                    <p className="text-[11px] text-muted-foreground">Student ID: {selectedSubmissionAssignment.student_id.slice(0, 8)}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${
                      selectedSubmissionAssignment.status === "completed" || selectedSubmissionAssignment.completed_at != null
                        ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
                        : "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-500/30"
                    }`}
                  >
                    {selectedSubmissionAssignment.status === "completed" || selectedSubmissionAssignment.completed_at != null
                      ? "Completed"
                      : "Pending"}
                  </span>
                </div>

                {selectedSubmissionAssignment.completed_at ? (
                  <div className="grid grid-cols-2 gap-2 pt-1 text-center">
                    <div className="rounded-lg bg-muted/50 p-2.5 border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Score</p>
                      <p className="text-xl font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                        {selectedSubmissionAssignment.score !== null ? `${selectedSubmissionAssignment.score}%` : "100%"}
                      </p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-2.5 border border-border">
                      <p className="text-[10px] text-muted-foreground uppercase">Completed At</p>
                      <p className="text-xs font-semibold text-foreground mt-1">
                        {new Date(selectedSubmissionAssignment.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg bg-muted/50 p-3 text-center text-muted-foreground border border-border">
                    <Clock className="h-5 w-5 mx-auto text-amber-500 mb-1" />
                    <p className="font-medium text-foreground text-xs">Awaiting Student Submission</p>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      This assignment has been dispatched to the learner's dashboard and is waiting to be launched.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <DialogFooter>
              <Button
                onClick={() => setSubmissionsOpen(false)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

export default SchoolAssignmentsPage;
