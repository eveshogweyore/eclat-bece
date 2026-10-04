import { useState, useMemo } from "react";
import { Briefcase, Search, Plus, Mail, Phone, Users, Building2, BookOpen, Edit2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { SchoolDataState } from "@/components/school/SchoolDataState";
import { SchoolAddTeacherDialog } from "@/components/school/SchoolAddTeacherDialog";
import { SchoolEditTeacherDialog } from "@/components/school/SchoolEditTeacherDialog";
import { useSchoolData, SchoolTeacherItem } from "@/hooks/useSchoolData";

const teacherLoginTone = (teacher: unknown) => {
  const linked = (teacher as { user_id?: string | null }).user_id;
  return linked
    ? "text-emerald-700 dark:text-emerald-300"
    : "text-amber-700 dark:text-amber-300";
};

export function SchoolTeachersPage() {
  const { school, teachers, classes, refresh, isLoading, error } = useSchoolData();
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("all");
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [selectedEditTeacher, setSelectedEditTeacher] = useState<SchoolTeacherItem | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  // Derive unique departments for filtering
  const departments = useMemo(() => {
    const set = new Set<string>();
    teachers.forEach((t) => {
      if (t.department) set.add(t.department);
    });
    return Array.from(set);
  }, [teachers]);

  const filteredTeachers = useMemo(() => {
    return teachers.filter((t) => {
      const q = search.toLowerCase();
      const matchesSearch =
        t.full_name.toLowerCase().includes(q) ||
        (t.email && t.email.toLowerCase().includes(q)) ||
        (t.department && t.department.toLowerCase().includes(q)) ||
        (t.primary_subject && t.primary_subject.toLowerCase().includes(q)) ||
        t.assigned_classes.some((c) => c.toLowerCase().includes(q));

      const matchesDept =
        deptFilter === "all" ||
        (t.department && t.department.toLowerCase() === deptFilter.toLowerCase());

      return matchesSearch && matchesDept;
    });
  }, [teachers, search, deptFilter]);

  if (isLoading) {
    return <SchoolDataState loading />;
  }
  if (error) {
    return <SchoolDataState error={error} onRetry={refresh} />;
  }

  return (
    <>
      <SchoolPageHeader
        title="Teacher Directory"
        subtitle="Manage faculty assignments, department allocations, and lead instructors."
        actions={
          <Button
            onClick={() => setAddDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add teacher
          </Button>
        }
      />
      {/* Search Bar & Department Filter */}
      <div className="mb-6 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs shadow-sm">
        <div className="flex items-center gap-2 flex-1 rounded-lg border border-border bg-muted/60 px-3 py-2 text-foreground focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search teachers by name, subject, department, or class arm..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        {departments.length > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-muted-foreground flex-shrink-0">Department:</span>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="h-9 rounded-lg border border-border bg-card px-3 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
            >
              <option value="all">All Departments ({teachers.length})</option>
              {departments.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Faculty List / Empty State */}
      {teachers.length === 0 ? (
        <Card className="border border-dashed border-border bg-card/60 p-12 text-center shadow-sm">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-primary">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">No Faculty Members Registered</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Add faculty members to assign departments, allocate subject duties, and appoint lead teachers across class arms.
              </p>
            </div>
            <Button
              onClick={() => setAddDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Add First Teacher
            </Button>
          </CardContent>
        </Card>
      ) : filteredTeachers.length === 0 ? (
        <div className="rounded-xl border border-border bg-card p-8 text-center text-xs text-muted-foreground shadow-sm">
          No faculty members match your search criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTeachers.map((teacher) => (
            <Card
              key={teacher.id}
              className="border border-border bg-card text-card-foreground hover:border-primary/40 transition-colors flex flex-col justify-between shadow-sm"
            >
              <CardContent className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-foreground text-base truncate">{teacher.full_name}</h3>
                    <p className="text-xs text-primary font-semibold truncate">{teacher.department || "Faculty Member"}</p>
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-0.5 text-[10px] font-semibold border flex-shrink-0 ${
                      teacher.status === "Active"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                        : "border-border bg-muted text-muted-foreground"
                    }`}
                  >
                    {teacher.status}
                  </span>
                </div>

                {/* Login status */}
                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`inline-block h-2 w-2 rounded-full flex-shrink-0 ${
                      (teacher as { user_id?: string | null }).user_id
                        ? "bg-emerald-500"
                        : "bg-amber-500"
                    }`}
                    aria-hidden="true"
                  />
                  <span className={teacherLoginTone(teacher)}>
                    {(teacher as { user_id?: string | null }).user_id
                      ? "Login active"
                      : "No portal account yet"}
                  </span>
                </div>

                {/* Primary Subject */}
                {teacher.primary_subject && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <BookOpen className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                    <span>Specialization: <strong className="text-foreground">{teacher.primary_subject}</strong></span>
                  </div>
                )}

                {/* Contact info if provided */}
                <div className="space-y-1 text-xs text-muted-foreground border-t border-border/60 pt-2">
                  {teacher.email && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Mail className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{teacher.email}</span>
                    </div>
                  )}
                  {teacher.phone && (
                    <div className="flex items-center gap-1.5 truncate">
                      <Phone className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                      <span className="truncate">{teacher.phone}</span>
                    </div>
                  )}
                </div>

                {/* Assigned Class Arms */}
                <div className="space-y-1.5 pt-2 border-t border-border/60 text-xs">
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-medium">
                    <span>Allocated Class Arms:</span>
                    <span className="text-primary font-semibold">
                      {teacher.assigned_classes.length} {teacher.assigned_classes.length === 1 ? "Class" : "Classes"}
                    </span>
                  </div>
                  {teacher.assigned_classes.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground italic">No class arms currently assigned.</p>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {teacher.assigned_classes.map((clsName) => (
                        <span
                          key={clsName}
                          className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/60 px-2 py-0.5 text-[10px] text-foreground"
                        >
                          <Building2 className="h-2.5 w-2.5 text-primary" />
                          {clsName}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Trigger */}
                <div className="pt-2 border-t border-border/60 flex justify-end">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSelectedEditTeacher(teacher);
                      setEditDialogOpen(true);
                    }}
                    className="h-7 px-2.5 border-border bg-card text-xs text-foreground hover:bg-accent hover:border-primary/50"
                  >
                    <Edit2 className="mr-1 h-3 w-3" />
                    Edit & Allocate
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Teacher Dialog */}
      {school?.id && (
        <SchoolAddTeacherDialog
          open={addDialogOpen}
          onOpenChange={setAddDialogOpen}
          schoolId={school.id}
          classes={classes}
          onCreated={() => refresh()}
        />
      )}

      {/* Edit Teacher Dialog */}
      {school?.id && (
        <SchoolEditTeacherDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          teacher={selectedEditTeacher}
          classes={classes}
          schoolId={school.id}
          onSaved={() => refresh()}
        />
      )}
    </>
  );
}

export default SchoolTeachersPage;
