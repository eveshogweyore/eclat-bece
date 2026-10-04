import { useMemo, useState } from "react";
import { Search, Users } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { PortalDataState } from "@/components/PortalDataState";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { TeacherAssignPracticeDialog } from "@/components/teacher/TeacherAssignPracticeDialog";
import { useTeacherData, TeacherStudent } from "@/hooks/useTeacherData";

export default function TeacherStudentsPage() {
  const { teacher, schoolId, students, isLoading, error, refresh } = useTeacherData();
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("all");
  const [selectedReportStudent, setSelectedReportStudent] = useState<TeacherStudent | null>(null);
  const [reportOpen, setReportOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<TeacherStudent | "all" | null>(null);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return students.filter((s) => {
      const matchesSearch =
        s.name.toLowerCase().includes(q) || (s.username && s.username.toLowerCase().includes(q));
      const matchesClass = classFilter === "all" || s.class_id === classFilter;
      return matchesSearch && matchesClass;
    });
  }, [students, search, classFilter]);

  if (isLoading) {
    return <PortalDataState loading />;
  }
  if (error) {
    return <PortalDataState error={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="My Students"
        subtitle="Students in your allocated class arms, with their practice performance."
        actions={
          <Button
            onClick={() => {
              setAssignTarget("all");
              setAssignOpen(true);
            }}
          >
            Assign practice
          </Button>
        }
      />

      <div className="rounded-xl border border-border bg-card shadow-sm overflow-hidden">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-border p-4 text-xs">
          <div className="flex items-center gap-2 flex-1 rounded-lg border border-border bg-muted/60 px-3 py-2 focus-within:border-primary/50">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or username..."
              className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
          </div>
          <select
            value={classFilter}
            onChange={(e) => setClassFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs focus:outline-none"
          >
            <option value="all">All my classes</option>
            {[...new Map(students.map((s) => [s.class_id, s.class_name])).entries()].map(
              ([id, name]) => (
                <option key={id} value={id}>
                  {name}
                </option>
              )
            )}
          </select>
        </div>

        {students.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold">No students in your allocated classes yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              Students appear here once your school enrolls them into one of your allocated class arms.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">No students match your filters.</div>
        ) : (
          <div className="divide-y divide-border/60">
            {filtered.map((student) => (
              <div key={student.id} className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{student.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {student.class_name} · @{student.username || "—"}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline text-xs text-muted-foreground">
                    {student.quizCount > 0 ? `${student.avgScore}% avg · ${student.quizCount} quizzes` : "No quizzes yet"}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setSelectedReportStudent(student);
                      setReportOpen(true);
                    }}
                  >
                    Report
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs"
                    onClick={() => {
                      setAssignTarget(student);
                      setAssignOpen(true);
                    }}
                  >
                    Assign
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedReportStudent && (
        <StudentReportDialog
          open={reportOpen}
          onOpenChange={(open) => {
            setReportOpen(open);
            if (!open) setSelectedReportStudent(null);
          }}
          studentId={selectedReportStudent.id}
          studentName={selectedReportStudent.name}
          studentClass={selectedReportStudent.class_name}
        />
      )}

      <TeacherAssignPracticeDialog
        open={assignOpen}
        onOpenChange={(open) => {
          setAssignOpen(open);
          if (!open) setAssignTarget(null);
        }}
        schoolId={schoolId || ""}
        teacherId={teacher?.id || ""}
        students={students.map((s) => ({
          id: s.id,
          name: s.name,
          class_id: s.class_id,
          class_name: s.class_name,
          class_year: s.class_year,
        }))}
        target={assignTarget === "all" ? "all" : assignTarget
          ? {
              id: assignTarget.id,
              name: assignTarget.name,
              class_id: assignTarget.class_id,
              class_name: assignTarget.class_name,
              class_year: assignTarget.class_year,
            }
          : null}
        onSuccess={refresh}
      />
    </div>
  );
}
