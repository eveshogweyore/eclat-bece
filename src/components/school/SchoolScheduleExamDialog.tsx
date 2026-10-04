import { useState, useEffect } from "react";
import { GraduationCap, Calendar, Clock, BookOpen, Layers, CheckCircle2, Loader2, Sparkles } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolClassItem } from "@/hooks/useSchoolData";
import { useSubjects } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SchoolScheduleExamDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classes: SchoolClassItem[];
  onCreated?: () => void;
}

const PRESET_TITLES = [
  "National BECE Full Mock Simulation 1",
  "National BECE Full Mock Simulation 2",
  "Common Entrance Diagnostic Assessment",
  "Mid-Term BECE Drill & Readiness Evaluation",
  "Inter-School State Mock Examination",
];

export function SchoolScheduleExamDialog({
  open,
  onOpenChange,
  schoolId,
  classes,
  onCreated,
}: SchoolScheduleExamDialogProps) {
  const [title, setTitle] = useState("");
  const [cohort, setCohort] = useState<"year_6" | "year_9">("year_9");
  const [targetClassId, setTargetClassId] = useState<string>("all");
  const [subject, setSubject] = useState("");
  const [examDate, setExamDate] = useState("");
  const [startTime, setStartTime] = useState("09:00 AM");
  const [durationMinutes, setDurationMinutes] = useState(120);
  const [questionCount, setQuestionCount] = useState(60);
  const [passingScore, setPassingScore] = useState(50);
  const [instructions, setInstructions] = useState(
    "Candidates must be seated 15 minutes before the exam commences. Calculators permitted where applicable."
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { subjects } = useSubjects({ classYear: cohort, onlyActive: true });

  // Set default date to 7 days from now
  useEffect(() => {
    if (open && !examDate) {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setExamDate(nextWeek.toISOString().slice(0, 10));
    }
  }, [open, examDate]);

  // Set default subject when subjects load
  useEffect(() => {
    if (subjects.length > 0 && !subject) {
      setSubject(subjects[0].name);
    }
  }, [subjects, subject]);

  const resetForm = () => {
    setTitle("");
    setCohort("year_9");
    setTargetClassId("all");
    setStartTime("09:00 AM");
    setDurationMinutes(120);
    setQuestionCount(60);
    setPassingScore(50);
    setIsSubmitting(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  // Filter classes matching current cohort
  const eligibleClasses = classes.filter((c) => {
    if (cohort === "year_6") {
      return c.class_year === "year_6" || c.level.toLowerCase().includes("primary") || c.level.toLowerCase().includes("year 6");
    }
    return c.class_year === "year_9" || c.level.toLowerCase().includes("jss") || c.level.toLowerCase().includes("year 9");
  });

  const handleScheduleExam = async () => {
    if (!title.trim()) {
      toast.error("Please enter an examination title.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Please select an examination subject.");
      return;
    }
    if (!examDate) {
      toast.error("Please choose the scheduled date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase.from("school_exams").insert({
        school_id: schoolId,
        title: title.trim(),
        cohort,
        class_id: targetClassId === "all" ? null : targetClassId,
        subject: subject.trim(),
        exam_date: examDate,
        start_time: startTime.trim() || null,
        duration_minutes: Number(durationMinutes),
        question_count: Number(questionCount),
        passing_score: Number(passingScore),
        status: "Scheduled",
        instructions: instructions.trim() || null,
      });

      if (error) throw error;

      toast.success("Examination scheduled successfully!");
      onCreated?.();
      handleClose();
    } catch (err: any) {
      console.error("Error scheduling exam:", err);
      toast.error(err.message || "Failed to schedule exam");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-border bg-card text-foreground w-[95vw] sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b border-[#1f2b42] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-[#3bc2f3] border border-sky-500/20">
              <GraduationCap className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Schedule Mock Examination</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Configure official mock simulations, assign candidate seatings, and schedule exam time windows.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4 text-xs">
          {/* Quick Preset Buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Quick Exam Presets</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESET_TITLES.slice(0, 3).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setTitle(p)}
                  className="rounded-lg border border-border bg-background px-2.5 py-1 text-[11px] text-muted-foreground hover:border-[#3bc2f3] hover:text-white transition-colors"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Title */}
          <div className="space-y-1.5">
            <Label htmlFor="exam-title" className="text-xs text-muted-foreground font-semibold">
              Examination Title *
            </Label>
            <Input
              id="exam-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. National BECE Full Mock Simulation 1"
              className="border-[#34415b] bg-background text-white text-xs h-9"
            />
          </div>

          {/* Cohort & Target Class */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exam-cohort" className="text-xs text-muted-foreground font-semibold">
                Candidate Cohort
              </Label>
              <select
                id="exam-cohort"
                value={cohort}
                onChange={(e) => setCohort(e.target.value as any)}
                className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
              >
                <option value="year_9">Year 9 (JSS 3 / BECE Candidates)</option>
                <option value="year_6">Year 6 (Primary 6 / Common Entrance)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-class" className="text-xs text-muted-foreground font-semibold">
                Target Class Arm
              </Label>
              <select
                id="exam-class"
                value={targetClassId}
                onChange={(e) => setTargetClassId(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
              >
                <option value="all">All Classes in Cohort (School-wide)</option>
                {eligibleClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name} ({cls.level})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Subject & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exam-subject" className="text-xs text-muted-foreground font-semibold">
                Subject *
              </Label>
              <select
                id="exam-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
                {!subjects.some((s) => s.name === "Mathematics") && <option value="Mathematics">Mathematics</option>}
                {!subjects.some((s) => s.name === "English Language") && <option value="English Language">English Language</option>}
                {!subjects.some((s) => s.name === "Basic Science & Technology") && <option value="Basic Science & Technology">Basic Science & Technology</option>}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-date" className="text-xs text-muted-foreground font-semibold">
                Examination Date *
              </Label>
              <Input
                id="exam-date"
                type="date"
                value={examDate}
                onChange={(e) => setExamDate(e.target.value)}
                className="border-[#34415b] bg-background text-white text-xs h-9"
              />
            </div>
          </div>

          {/* Time, Duration & Question Count */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exam-time" className="text-xs text-muted-foreground font-semibold">
                Start Time
              </Label>
              <Input
                id="exam-time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                placeholder="09:00 AM"
                className="border-[#34415b] bg-background text-white text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-duration" className="text-xs text-muted-foreground font-semibold">
                Duration (Minutes)
              </Label>
              <select
                id="exam-duration"
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
              >
                <option value={45}>45 Minutes (Short Drill)</option>
                <option value={60}>60 Minutes (1 Hour)</option>
                <option value={90}>90 Minutes (1.5 Hours)</option>
                <option value={120}>120 Minutes (Standard BECE)</option>
                <option value={150}>150 Minutes (2.5 Hours)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="exam-questions" className="text-xs text-muted-foreground font-semibold">
                Questions
              </Label>
              <select
                id="exam-questions"
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
              >
                <option value={30}>30 Questions</option>
                <option value={40}>40 Questions</option>
                <option value={50}>50 Questions</option>
                <option value={60}>60 Questions (BECE Standard)</option>
                <option value={80}>80 Questions</option>
                <option value={100}>100 Questions</option>
              </select>
            </div>
          </div>

          {/* Pass Mark & Instructions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="exam-pass" className="text-xs text-muted-foreground font-semibold">
                Pass Mark Benchmark (%)
              </Label>
              <Input
                id="exam-pass"
                type="number"
                min={30}
                max={90}
                value={passingScore}
                onChange={(e) => setPassingScore(Number(e.target.value))}
                className="border-[#34415b] bg-background text-white text-xs h-9"
              />
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="exam-instructions" className="text-xs text-muted-foreground font-semibold">
                Candidate Instructions & Seating Rules
              </Label>
              <Input
                id="exam-instructions"
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
                placeholder="Candidate instructions..."
                className="border-[#34415b] bg-background text-white text-xs h-9"
              />
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-[#1f2b42] pt-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-[#34415b] text-muted-foreground hover:text-white text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleScheduleExam}
            disabled={isSubmitting}
            className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-bold text-xs"
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Schedule Examination
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SchoolScheduleExamDialog;
