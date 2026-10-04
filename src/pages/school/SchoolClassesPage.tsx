import { useState, useMemo } from "react";
import { Building2, Plus, Search, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SchoolPageHeader } from "@/components/school/SchoolPageHeader";
import { SchoolDataState } from "@/components/school/SchoolDataState";
import { SchoolConfirmDialog } from "@/components/school/SchoolConfirmDialog";
import { CreateClassDialog } from "@/components/school/SchoolCreateDialogs";
import { useSchoolData } from "@/hooks/useSchoolData";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function SchoolClassesPage() {
  const { school, students, classes, isLoading, error, refresh: refreshSchoolData } = useSchoolData();
  const [classDialogOpen, setClassDialogOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [levelFilter, setLevelFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);

  const confirmDeleteClass = () => {
    if (!deleteTarget) return;
    const { id, name } = deleteTarget;
    setDeleteTarget(null);
    void (async () => {
      try {
        setDeletingId(id);
        const { error } = await supabase
          .from("school_classes")
          .delete()
          .eq("id", id);

        if (error) throw error;
        toast.success(`Class "${name}" deleted`);
        refreshSchoolData();
      } catch (err: any) {
        console.error("Error deleting class:", err);
        toast.error(err?.message || "Failed to delete class");
      } finally {
        setDeletingId(null);
      }
    })();
  };

  const filteredClasses = useMemo(() => {
    return classes.map((c) => ({
      ...c,
      avgScoreFormatted: c.avgScore > 0 ? `${c.avgScore}%` : "—",
    })).filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(search.toLowerCase()) ||
        c.level.toLowerCase().includes(search.toLowerCase()) ||
        (c.lead_teacher && c.lead_teacher.toLowerCase().includes(search.toLowerCase()));

      const matchesLevel =
        levelFilter === "all" ||
        (levelFilter === "year_9" && (c.class_year === "year_9" || c.level.toLowerCase().includes("jss"))) ||
        (levelFilter === "year_6" && (c.class_year === "year_6" || c.level.toLowerCase().includes("primary")));

      return matchesSearch && matchesLevel;
    });
  }, [classes, search, levelFilter]);

  const totalClassesCount = classes.length;
  const beceCandidates = students.filter((s) => s.class_year === "year_9").length;
  const commonEntranceCandidates = students.filter((s) => s.class_year === "year_6").length;

  if (isLoading) {
    return <SchoolDataState loading />;
  }
  if (error) {
    return <SchoolDataState error={error} onRetry={refreshSchoolData} />;
  }

  return (
    <>
      <SchoolPageHeader
        title="Classes & Cohorts"
        subtitle="Manage examination cohorts, class streams, and assigned faculty."
        actions={
          <Button
            onClick={() => setClassDialogOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm shadow-sm"
          >
            <Plus className="mr-1.5 h-4 w-4" />
            Add class
          </Button>
        }
      />
      {/* Metric Cards */}
      <div className="mb-6 grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          ["Total classes", totalClassesCount.toString(), "Active school cohorts"],
          ["Total learners", students.length.toString(), "Enrolled in institution"],
          ["BECE Candidates", beceCandidates.toString(), "Year 9 (JSS 3) students"],
          ["Common Entrance", commonEntranceCandidates.toString(), "Year 6 (Primary 6) students"],
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

      {/* Filter and Search Bar */}
      <div className="mb-6 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-xl border border-border bg-card p-3 text-xs shadow-sm">
        <div className="flex items-center gap-2 flex-1 rounded-lg border border-border bg-muted/60 px-3 py-2 text-foreground focus-within:border-primary/50 focus-within:ring-1 focus-within:ring-primary/20">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search classes by name, level or lead teacher..."
            className="w-full bg-transparent text-xs text-foreground placeholder:text-muted-foreground focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary/30"
          >
            <option value="all">All Cohorts</option>
            <option value="year_9">Year 9 / JSS 3 (BECE)</option>
            <option value="year_6">Year 6 / Primary 6 (Common Entrance)</option>
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && classes.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 rounded-xl border border-border bg-card text-muted-foreground shadow-sm">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-3" />
          <p className="text-sm font-semibold">Loading class cohorts...</p>
        </div>
      ) : filteredClasses.length === 0 ? (
        /* Empty State */
        <Card className="border border-dashed border-border bg-card/60 p-12 text-center shadow-sm">
          <CardContent className="space-y-4 max-w-md mx-auto">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-muted text-primary">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">No Classes Created Yet</h3>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                Organize your school learners into distinct class streams (e.g. JSS 3A, Primary 6 Gold) to manage exam preparation and track cohort averages.
              </p>
            </div>
            <Button
              onClick={() => setClassDialogOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold"
            >
              <Plus className="mr-1.5 h-3.5 w-3.5" />
              Create First Class
            </Button>
          </CardContent>
        </Card>
      ) : (
        /* Class Cards Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredClasses.map((klass) => (
            <Card
              key={klass.id}
              className="border border-border bg-card text-card-foreground min-w-0 hover:border-primary/40 transition-colors flex flex-col justify-between shadow-sm"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg font-bold text-foreground leading-tight truncate">
                    {klass.name}
                  </CardTitle>
                  <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300 flex-shrink-0">
                    {klass.badge}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mt-1 truncate">
                  Lead: {klass.lead_teacher || "Unassigned"}
                </p>
              </CardHeader>
              <CardContent className="space-y-4 pt-0">
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-muted-foreground text-[11px]">Enrolled</p>
                    <p className="mt-1 text-xl font-black text-foreground">{klass.studentsCount}</p>
                  </div>
                  <div className="rounded-lg border border-border bg-muted/40 p-2.5">
                    <p className="text-muted-foreground text-[11px]">Cohort Avg</p>
                    <p className="mt-1 text-xl font-black text-primary">{klass.avgScoreFormatted}</p>
                  </div>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                  <span className="text-[11px] text-muted-foreground">
                    Level: {klass.level}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === klass.id}
                    aria-label={`Delete class ${klass.name}`}
                    onClick={() => setDeleteTarget({ id: klass.id, name: klass.name })}
                    className="h-7 px-2 text-destructive hover:bg-destructive/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateClassDialog
        open={classDialogOpen}
        onOpenChange={setClassDialogOpen}
        onCreated={refreshSchoolData}
      />
      <SchoolConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Delete class "${deleteTarget?.name}"?`}
        description="Students enrolled in this class will be unassigned. This action cannot be undone."
        onConfirm={confirmDeleteClass}
      />
    </>
  );
}

export default SchoolClassesPage;
