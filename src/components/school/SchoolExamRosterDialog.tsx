import { useState, useMemo } from "react";
import { Users, Search, Download, Printer, CheckCircle2, AlertCircle, Sparkles, BookOpen } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { SchoolExamItem, SchoolStudent, SchoolClassItem } from "@/hooks/useSchoolData";
import { toast } from "sonner";

interface SchoolExamRosterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  exam: SchoolExamItem | null;
  students: SchoolStudent[];
  classes: SchoolClassItem[];
}

export function SchoolExamRosterDialog({
  open,
  onOpenChange,
  exam,
  students,
  classes,
}: SchoolExamRosterDialogProps) {
  const [search, setSearch] = useState("");

  const classMap = useMemo(() => {
    return new Map(classes.map((c) => [c.id, c.name]));
  }, [classes]);

  // Filter students eligible for this examination
  const eligibleCandidates = useMemo(() => {
    if (!exam) return [];
    return students
      .filter((s) => {
        if (exam.class_id) {
          return s.class_id === exam.class_id;
        }
        return s.class_year === exam.cohort;
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [students, exam]);

  const filteredCandidates = useMemo(() => {
    const q = search.toLowerCase();
    return eligibleCandidates.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.username && s.username.toLowerCase().includes(q)) ||
        (s.unique_id && s.unique_id.toLowerCase().includes(q))
    );
  }, [eligibleCandidates, search]);

  const handleExportCSV = () => {
    if (!exam || eligibleCandidates.length === 0) return;

    const exportRows = [
      ["Seat Number", "Candidate Roll No", "Full Name", "Username", "Cohort", "Class Arm", "Diagnostic Score"],
      ...eligibleCandidates.map((s, idx) => [
        `Seat #${String(idx + 1).padStart(2, "0")}`,
        s.unique_id || `BECE-${String(idx + 1).padStart(3, "0")}`,
        `"${s.name.replace(/"/g, '""')}"`,
        s.username || "—",
        exam.cohort === "year_6" ? "Year 6 (Primary 6)" : "Year 9 (JSS 3)",
        `"${(s.class_id ? classMap.get(s.class_id) || "Assigned" : "General Cohort").replace(/"/g, '""')}"`,
        s.quizCount > 0 ? `${s.avgScore}%` : "Not assessed",
      ]),
    ];

    const csvContent = exportRows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `candidate_seating_roster_${exam.title.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Seating roster exported to CSV!");
  };

  if (!exam) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground w-[95vw] sm:max-w-3xl max-h-[92vh] flex flex-col p-0 overflow-hidden">
        {/* Header */}
        <DialogHeader className="border-b border-[#1f2b42] px-6 py-4 bg-[#0a1220]">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <span className="text-[11px] font-semibold text-[#58c4e8] uppercase tracking-wider">
                Candidate Seating & Roll Call
              </span>
              <DialogTitle className="text-lg font-bold text-white mt-0.5 truncate">
                {exam.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-1">
                {exam.subject} • {exam.duration_minutes} Mins • {exam.exam_date}
                {exam.start_time ? ` at ${exam.start_time}` : ""} • Target: {exam.class_name || "School-wide Cohort"}
              </DialogDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportCSV}
              disabled={eligibleCandidates.length === 0}
              className="border-[#34415b] bg-background text-slate-200 hover:text-white text-xs flex-shrink-0"
            >
              <Download className="mr-1.5 h-3.5 w-3.5" />
              Export Roster (.csv)
            </Button>
          </div>
        </DialogHeader>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {/* Seating Info Banner */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 rounded-xl border border-[#233148] bg-background p-3 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground">Total Seated</p>
              <p className="text-base font-bold text-white mt-0.5">{eligibleCandidates.length} Candidates</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Questions</p>
              <p className="text-base font-bold text-[#71c9ed] mt-0.5">{exam.question_count} Items</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Passing Mark</p>
              <p className="text-base font-bold text-emerald-400 mt-0.5">{exam.passing_score}%</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Hall Status</p>
              <p className="text-base font-bold text-sky-400 mt-0.5">{exam.status}</p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="flex items-center gap-2 rounded-lg border border-[#34415b] bg-background px-3 py-2 text-slate-200">
            <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search candidate by name, username or roll number..."
              className="w-full bg-transparent text-xs text-white placeholder:text-muted-foreground focus:outline-none"
            />
          </div>

          {/* Candidates Seating Table */}
          <div className="rounded-xl border border-[#233148] bg-background overflow-hidden max-h-[360px] overflow-y-auto">
            <div className="grid grid-cols-[80px_1.5fr_1fr_1fr_100px] border-b border-[#1f2b42] bg-card px-3 py-2 text-[11px] font-semibold text-muted-foreground sticky top-0 z-10">
              <span>Seat No.</span>
              <span>Candidate</span>
              <span>Roll Number</span>
              <span>Class Arm</span>
              <span className="text-right">Readiness</span>
            </div>

            {filteredCandidates.length === 0 ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                {eligibleCandidates.length === 0
                  ? "No students match this exam's cohort or class allocation."
                  : "No candidates match your search query."}
              </div>
            ) : (
              filteredCandidates.map((candidate, idx) => (
                <div
                  key={candidate.id}
                  className="grid grid-cols-[80px_1.5fr_1fr_1fr_100px] items-center border-b border-[#172236] px-3 py-2.5 text-xs text-slate-200 hover:bg-[#111e33] transition-colors"
                >
                  {/* Seat Number */}
                  <span className="font-mono text-xs font-bold text-[#3bc2f3]">
                    #{String(idx + 1).padStart(2, "0")}
                  </span>

                  {/* Name */}
                  <div className="min-w-0 pr-2">
                    <p className="font-semibold text-white truncate">{candidate.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono truncate">@{candidate.username}</p>
                  </div>

                  {/* Roll Number */}
                  <span className="font-mono text-[11px] text-muted-foreground truncate">
                    {candidate.unique_id || `BECE-${String(idx + 1).padStart(3, "0")}`}
                  </span>

                  {/* Class Arm */}
                  <span className="text-[11px] text-muted-foreground truncate">
                    {candidate.class_id ? classMap.get(candidate.class_id) || "Assigned" : "General Cohort"}
                  </span>

                  {/* Diagnostic Accuracy */}
                  <div className="text-right">
                    {candidate.quizCount > 0 ? (
                      <span className={`font-bold ${candidate.avgScore >= 60 ? "text-emerald-400" : "text-amber-400"}`}>
                        {candidate.avgScore}%
                      </span>
                    ) : (
                      <span className="text-slate-500">—</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <DialogFooter className="border-t border-[#1f2b42] px-6 py-3.5 bg-[#0a1220] flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {eligibleCandidates.length} eligible candidates assigned to hall
          </span>
          <Button
            onClick={() => onOpenChange(false)}
            className="bg-[#2184a7] text-white hover:bg-[#2c9bc2] text-xs font-semibold"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SchoolExamRosterDialog;
