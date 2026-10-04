import { useNavigate } from "react-router-dom";
import { Users, ClipboardCheck, TrendingUp, School } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { PortalDataState } from "@/components/PortalDataState";
import { useTeacherData } from "@/hooks/useTeacherData";

export default function TeacherDashboardPage() {
  const navigate = useNavigate();
  const { teacher, schoolName, classes, students, assignments, isLoading, error, refresh } = useTeacherData();

  if (isLoading) {
    return <PortalDataState loading />;
  }
  if (error) {
    return <PortalDataState error={error} onRetry={refresh} />;
  }

  const tested = students.filter((s) => s.quizCount > 0);
  const avgScore = tested.length > 0
    ? Math.round(tested.reduce((acc, s) => acc + s.avgScore, 0) / tested.length)
    : 0;
  const pending = assignments.filter((a) => a.status === "pending").length;

  const cards = [
    { label: "My Classes", value: classes.length.toString(), hint: "Allocated class arms", icon: School, tone: "text-sky-600 dark:text-[#51c6eb]" },
    { label: "My Students", value: students.length.toString(), hint: "Across allocated classes", icon: Users, tone: "text-violet-600 dark:text-violet-400" },
    { label: "Pending Tasks", value: pending.toString(), hint: "Awaiting completion", icon: ClipboardCheck, tone: "text-amber-600 dark:text-amber-400" },
    { label: "Avg. Score", value: tested.length > 0 ? `${avgScore}%` : "—", hint: `${tested.length} of ${students.length} assessed`, icon: TrendingUp, tone: "text-emerald-600 dark:text-emerald-400" },
  ];

  return (
    <div className="space-y-6">
      <SchoolPageHeader
        title={`Welcome${teacher?.fullName ? `, ${teacher.fullName.split(" ")[0]}` : ""}!`}
        subtitle={schoolName ? `Teaching at ${schoolName}.` : "Your teaching dashboard."}
        actions={
          <Button onClick={() => navigate("/dashboard/teacher/assignments?assign=1")} className="gap-1.5">
            <ClipboardCheck className="h-4 w-4" />
            Assign practice
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Card key={card.label} className="border border-border bg-card shadow-sm min-w-0">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground truncate">
                      {card.label}
                    </p>
                    <p className="mt-2 text-2xl sm:text-3xl font-black text-foreground truncate">{card.value}</p>
                    <p className={`mt-1 text-[11px] font-medium truncate ${card.tone}`}>{card.hint}</p>
                  </div>
                  <div className="rounded-xl bg-muted p-2.5 shrink-0">
                    <Icon className="h-5 w-5 text-foreground/70" />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <School className="h-4 w-4 text-primary" />
              My Allocated Classes
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {classes.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No classes allocated yet. Ask your school administrator to allocate you to class arms.
              </p>
            ) : (
              classes.map((c) => {
                const count = students.filter((s) => s.class_id === c.id).length;
                return (
                  <div key={c.id} className="flex items-center justify-between rounded-xl border border-border bg-muted/30 px-3.5 py-2.5 text-sm">
                    <span className="font-semibold text-foreground truncate">{c.name}</span>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {c.class_year === "year_9" ? "Year 9" : "Year 6"} · {count} student{count === 1 ? "" : "s"}
                    </span>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Users className="h-4 w-4 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/dashboard/teacher/students")}>
              <Users className="mr-2 h-4 w-4" />
              View my students
            </Button>
            <Button variant="outline" className="w-full justify-start" onClick={() => navigate("/dashboard/teacher/assignments")}>
              <ClipboardCheck className="mr-2 h-4 w-4" />
              View & assign practice tasks
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
