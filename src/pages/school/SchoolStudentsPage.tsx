import { useState, useMemo } from "react";
import { Users, Search, Plus, BookOpen, FileText, Sparkles, Trophy, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { SchoolDataState } from "@/components/school/SchoolDataState";
import { CreateStudentDialog } from "@/components/school/SchoolCreateDialogs";
import { SchoolBulkStudentDialog } from "@/components/school/SchoolBulkStudentDialog";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { SchoolAssignPracticeDialog } from "@/components/school/SchoolAssignPracticeDialog";
import { useSchoolData, SchoolStudent } from "@/hooks/useSchoolData";

export function SchoolStudentsPage() {
  const [studentDialogOpen, setStudentDialogOpen] = useState(false);
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  // Selected student dialog states
  const [selectedReportStudent, setSelectedReportStudent] = useState<SchoolStudent | null>(null);
  const [reportOpen, setReportOpen] = useState(false);

  const [selectedAssignStudent, setSelectedAssignStudent] = useState<SchoolStudent | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const { school, students, classes, gamificationTotals, refresh, isLoading, error } = useSchoolData();

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const q = searchQuery.toLowerCase();
      const matchesSearch =
        student.name.toLowerCase().includes(q) ||
        (student.unique_id && student.unique_id.toLowerCase().includes(q)) ||
        (student.username && student.username.toLowerCase().includes(q));

      const matchesClass =
        classFilter === "all" ||
        (classFilter === "year_6" && student.class_year === "year_6") ||
        (classFilter === "year_9" && student.class_year === "year_9");

      const matchesStatus =
        statusFilter === "all" || student.status.toLowerCase() === statusFilter.toLowerCase();

      return matchesSearch && matchesClass && matchesStatus;
    });
  }, [students, searchQuery, classFilter, statusFilter]);

  const totalCount = students.length;
  const activeCount = gamificationTotals.activeLearnersCount;
  const year9Count = students.filter((s) => s.class_year === "year_9").length;
  const year6Count = students.filter((s) => s.class_year === "year_6").length;

  // Real pagination over the filtered roster
  const PAGE_SIZE = 25;
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(filteredStudents.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pagedStudents = filteredStudents.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  if (isLoading) {
    return <SchoolDataState loading />;
  }
  if (error) {
    return <SchoolDataState error={error} onRetry={refresh} />;
  }

  return (
    <>
      <SchoolPageHeader
        title="Students"
        subtitle="Review active learners, diagnostic profiles, and performance records."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={() => setBulkDialogOpen(true)}
              className="border-border bg-card text-foreground hover:bg-accent font-semibold text-xs sm:text-sm"
            >
              <Upload className="mr-1.5 h-4 w-4" />
              Bulk Import CSV
            </Button>
            <Button
              onClick={() => setStudentDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add student
            </Button>
          </div>
        }
      />
      {/* Metric Cards */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          ["Total students", totalCount.toString(), "Enrolled learners"],
          ["Active learners", activeCount.toString(), totalCount > 0 ? `${Math.round((activeCount / totalCount) * 100)}% active` : "Awaiting drills"],
          ["Year 9 (JSS 3)", year9Count.toString(), "BECE candidates"],
          ["Year 6 (Primary 6)", year6Count.toString(), "Common entrance"],
        ].map(([label, value, hint]) => (
          <Card key={label} className="border border-border bg-card text-card-foreground shadow-sm min-w-0">
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

      {/* Main Table / Container */}
      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        {/* Filter Controls Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border p-4 text-xs">
          <div className="flex items-center gap-2 flex-1 rounded-lg border border-border bg-muted/60 px-3 py-2 text-foreground focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search by student name, username, or unique ID..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={classFilter}
              onChange={(e) => {
                setClassFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-card text-foreground px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All Cohorts</option>
              <option value="year_9">Year 9 (BECE)</option>
              <option value="year_6">Year 6 (Common Entrance)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-border bg-card text-foreground px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>

        {/* Empty State vs Student Table */}
        {students.length === 0 ? (
          <div className="p-12 text-center space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-primary">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">No Students Enrolled Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto leading-relaxed">
                Add learners to your institution directory to create their login accounts and start tracking curriculum progress.
              </p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-1">
              <Button
                variant="outline"
                onClick={() => setBulkDialogOpen(true)}
                className="border-border bg-card text-foreground hover:bg-accent text-xs font-semibold"
              >
                <Upload className="mr-1.5 h-3.5 w-3.5" />
                Bulk Import CSV
              </Button>
              <Button
                onClick={() => setStudentDialogOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
              >
                <Plus className="mr-1.5 h-3.5 w-3.5" />
                Add First Student
              </Button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="min-w-[760px]">
              <div className="grid grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_1.4fr] border-b border-border px-4 py-3 text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground bg-muted/50">
                <span>Student</span>
                <span>Student ID</span>
                <span>Cohort</span>
                <span>Gamification</span>
                <span className="text-right">Avg Score</span>
                <span className="text-right pr-2">Actions</span>
              </div>

              {filteredStudents.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">
                  No students match your filter criteria.
                </div>
              ) : (
                pagedStudents.map((student) => (
                  <div
                    key={student.id}
                    className="grid grid-cols-[1.5fr_1fr_1fr_1fr_0.8fr_1.4fr] items-center border-b border-border/60 px-4 py-3 text-xs text-foreground hover:bg-muted/40 transition-colors"
                  >
                    {/* Student Name */}
                    <div className="min-w-0 pr-2">
                      <p className="font-semibold text-foreground truncate">{student.name}</p>
                      <p className="text-[11px] text-muted-foreground font-mono truncate">@{student.username}</p>
                    </div>

                    {/* ID */}
                    <span className="font-mono text-muted-foreground text-[11px] truncate">
                      {student.unique_id || student.id.slice(0, 8)}
                    </span>

                    {/* Cohort */}
                    <span className="text-foreground text-xs truncate">
                      {student.class_year === "year_6" ? "Year 6 (Primary 6)" : "Year 9 (JSS 3)"}
                    </span>

                    {/* Gamification stats */}
                    <div className="flex items-center gap-1.5 text-xs text-amber-500 font-medium">
                      <Trophy className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{(student.lifetime_ep || 0).toLocaleString()} EP</span>
                      <span className="text-[10px] text-muted-foreground font-normal">Lvl {student.current_level}</span>
                    </div>

                    {/* Score */}
                    <span className="text-right font-bold text-foreground">
                      {student.quizCount > 0 ? `${student.avgScore}%` : "—"}
                    </span>

                    {/* Action Triggers */}
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedReportStudent(student);
                          setReportOpen(true);
                        }}
                        className="h-7 px-2 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 dark:text-[#55c8ed] dark:hover:text-white dark:hover:bg-sky-500/10"
                        title="View Diagnostic Report"
                      >
                        <FileText className="mr-1 h-3.5 w-3.5" />
                        Report
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAssignStudent(student);
                          setAssignOpen(true);
                        }}
                        className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:text-white dark:hover:bg-amber-500/10"
                        title="Assign Targeted Practice"
                      >
                        <BookOpen className="mr-1 h-3.5 w-3.5" />
                        Assign
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-3 text-[11px] text-muted-foreground border-t border-border">
          <span>
            Showing {filteredStudents.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–
            {Math.min(safePage * PAGE_SIZE, filteredStudents.length)} of {filteredStudents.length} matching students
            ({students.length} enrolled)
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                disabled={safePage <= 1}
                onClick={() => setPage(safePage - 1)}
              >
                Previous
              </Button>
              <span className="font-medium text-foreground">
                Page {safePage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="h-7 px-2.5 text-[11px]"
                disabled={safePage >= totalPages}
                onClick={() => setPage(safePage + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Create Student Modal */}
      <CreateStudentDialog
        open={studentDialogOpen}
        onOpenChange={setStudentDialogOpen}
        classes={classes}
        onCreated={() => refresh()}
      />

      {/* Bulk Import CSV Modal */}
      <SchoolBulkStudentDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        classes={classes}
        onSuccess={() => refresh()}
      />

      {/* Student Diagnostic Report Modal */}
      {selectedReportStudent && (
        <StudentReportDialog
          open={reportOpen}
          onOpenChange={setReportOpen}
          studentId={selectedReportStudent.id}
          studentName={selectedReportStudent.name}
          studentClass={selectedReportStudent.class_year === "year_6" ? "Year 6 (Common Entrance)" : "Year 9 (BECE)"}
          avatar={selectedReportStudent.avatar || "🎓"}
        />
      )}

      {/* Assign Practice Modal Pre-Selected for Student */}
      {school?.id && selectedAssignStudent && (
        <SchoolAssignPracticeDialog
          open={assignOpen}
          onOpenChange={setAssignOpen}
          schoolId={school.id}
          defaultCohort={selectedAssignStudent.class_year || "year_9"}
          students={[{ id: selectedAssignStudent.id, name: selectedAssignStudent.name, class_year: selectedAssignStudent.class_year }]}
          onSuccess={() => {
            refresh();
          }}
        />
      )}
    </>
  );
}

export default SchoolStudentsPage;
