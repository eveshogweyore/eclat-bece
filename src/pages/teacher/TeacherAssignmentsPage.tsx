import { useMemo } from "react";
import { ClipboardCheck, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { PortalDataState } from "@/components/PortalDataState";
import { TeacherAssignPracticeDialog } from "@/components/teacher/TeacherAssignPracticeDialog";
import { useTeacherData, TeacherStudent } from "@/hooks/useTeacherData";
import { relativeTime } from "@/lib/dateUtils";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function TeacherAssignmentsPage() {
  const navigate = useNavigate();
  const { teacher, students, assignments, isLoading, error, refresh } = useTeacherData();
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignTarget, setAssignTarget] = useState<TeacherStudent | "all" | null>("all");

  const studentMap = useMemo(() => new Map(students.map((s) => [s.id, s])), [students]);
  const pending = assignments.filter((a) => a.status === "pending");
  const completed = assignments.filter((a) => a.status === "completed");

  if (isLoading) {
    return <PortalDataState loading />;
  }
  if (error) {
    return <PortalDataState error={error} onRetry={refresh} />;
  }

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title="Practice Tasks"
        subtitle="Tasks assigned to students in your allocated classes."
        actions={
          <Button
            onClick={() => {
              setAssignTarget("all");
              setAssignOpen(true);
            }}
            className="gap-1.5"
          >
            <ClipboardCheck className="h-4 w-4" />
            Assign practice
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Pending</p>
          <p className="mt-2 text-2xl font-black">{pending.length}</p>
        </Card>
        <Card className="p-4">
          <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Completed</p>
          <p className="mt-2 text-2xl font-black">{completed.length}</p>
        </Card>
      </div>

      {assignments.length === 0 ? (
        <Card className="p-12 text-center space-y-3">
          <Users className="mx-auto h-10 w-10 text-muted-foreground/40" />
          <p className="font-semibold">No practice tasks yet</p>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            Assign your first practice task to students in your allocated classes.
          </p>
          <Button onClick={() => setAssignOpen(true)}>Assign practice</Button>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a) => {
            const isMine = teacher && a.created_by_teacher_id === teacher.id;
            return (
              <Card key={a.id} className="p-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-foreground">{a.subject}</span>
                    <span className="text-[11px] text-muted-foreground">• {a.student_name}</span>
                    <Badge
                      variant="outline"
                      className={
                        a.status === "completed"
                          ? "bg-emerald-500/10 text-emerald-600 border-none text-[10px]"
                          : "bg-amber-500/10 text-amber-600 border-none text-[10px]"
                      }
                    >
                      {a.status}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      {isMine ? "Assigned by you" : "Assigned by school"}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {a.num_questions} questions · {a.duration} min · {relativeTime(a.created_at)}
                    {a.completed_at ? ` · completed ${relativeTime(a.completed_at)}` : ""}
                  </p>
                </div>
                {typeof a.score === "number" && (
                  <Badge className="bg-primary/10 text-primary border-none font-black text-sm shrink-0">
                    {a.score}%
                  </Badge>
                )}
              </Card>
            );
          })}
        </div>
      )}

      <TeacherAssignPracticeDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        schoolId={students[0]?.class_id ? "" : ""} // unused here; schoolId passed via hook data below
        teacherId={teacher?.id || ""}
        students={students.map((s) => ({
          id: s.id,
          name: s.name,
          class_id: s.class_id,
          class_name: s.class_name,
          class_year: (s.class_year as "year_6" | "year_9" | null) ?? null,
        }))}
        target={assignTarget}
        onSuccess={refresh}
      />

      {navigate && null}
    </div>
  );
}
