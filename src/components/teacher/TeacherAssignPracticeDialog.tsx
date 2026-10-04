import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ScrollArea } from "@/components/ui/scroll-area";
import { BookOpen, Clock, Target, ChevronRight, ChevronLeft, Loader2, CheckCircle2, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentOption {
  id: string;
  name: string;
  class_id: string | null;
  class_name: string;
  class_year: string | null;
}

interface TeacherAssignPracticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  teacherId: string;
  defaultCohort?: "year_6" | "year_9";
  /** Pre-selected student (per-student Assign action) or "all" for the whole roster. */
  target?: StudentOption | "all" | null;
  students: StudentOption[];
  onSuccess?: () => void;
}

type Step = "target" | "subject" | "topics" | "config" | "summary";

function LabelWrap({ text }: { text: string }) {
  return <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">{text}</p>;
}

/**
 * Teacher flow for assigning practice tasks. Mirrors the school wizard but is
 * scoped to the teacher's allocated-class students and attributes every row to
 * the teacher (created_by_teacher_id), which both RLS and the integrity
 * trigger validate server-side.
 */
export function TeacherAssignPracticeDialog({
  open,
  onOpenChange,
  schoolId,
  teacherId,
  defaultCohort = "year_9",
  target,
  students,
  onSuccess,
}: TeacherAssignPracticeDialogProps) {
  const [step, setStep] = useState<Step>("target");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [targetType, setTargetType] = useState<"all" | "individual">("all");
  const [selectedCohort, setSelectedCohort] = useState<"year_6" | "year_9">(defaultCohort);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  const [subjectsMetadata, setSubjectsMetadata] = useState<Record<string, string[]>>({});
  const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);

  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [numQuestions, setNumQuestions] = useState<number>(15);
  const [duration, setDuration] = useState<number>(30);
  const [maxAvailableQuestions, setMaxAvailableQuestions] = useState<number>(15);

  useEffect(() => {
    if (defaultCohort) setSelectedCohort(defaultCohort);
  }, [defaultCohort]);

  // Apply the incoming target when the dialog opens.
  useEffect(() => {
    if (!open) {
      setStep("target");
      setTargetType("all");
      setSelectedSubject("");
      setSelectedTopics([]);
      setNumQuestions(15);
      setDuration(30);
      setSelectedStudentId("");
      return;
    }
    if (target && target !== "all") {
      setTargetType("individual");
      setSelectedStudentId(target.id);
      if (target.class_year === "year_6" || target.class_year === "year_9") {
        setSelectedCohort(target.class_year);
      }
    } else {
      setTargetType("all");
    }
    fetchMetadata(selectedCohort);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, target]);

  const fetchMetadata = async (cohort: "year_6" | "year_9") => {
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("quiz-utilities", {
        body: { action: "get-metadata", class_year: cohort },
      });
      if (error) throw error;
      const payload = data as { subjects?: Record<string, string[]> };
      if (payload?.subjects) {
        setSubjectsMetadata(payload.subjects);
        setAvailableSubjects(Object.keys(payload.subjects));
      }
    } catch (err) {
      console.error("Error fetching subjects:", err);
      toast.error("Could not load subjects. Using defaults.");
      setSubjectsMetadata({
        Mathematics: ["Number & Numeration", "Algebraic Processes", "Geometry"],
        "English Language": ["Comprehension Passages", "Grammar & Composition"],
      });
      setAvailableSubjects(["Mathematics", "English Language"]);
    } finally {
      setIsSubmitting(false);
    }
  };

  const fetchQuestionCount = async (subject: string, topics: string[]) => {
    try {
      const tableName = selectedCohort === "year_6" ? "quiz_questions_year6" : "quiz_questions_year9";
      const { count, error } = await supabase
        .from(tableName)
        .select("*", { count: "exact", head: true })
        .eq("subject", subject)
        .in("topic", topics);
      if (error) throw error;
      setMaxAvailableQuestions(count || 0);
      if (numQuestions > count && count > 0) setNumQuestions(count);
    } catch (error) {
      console.error("Error fetching question count:", error);
      setMaxAvailableQuestions(30);
    }
  };

  const filteredStudents = students.filter(
    (s) => !s.class_year || s.class_year === selectedCohort
  );

  const getTargetStudents = () => {
    if (targetType === "individual") {
      return filteredStudents.filter((s) => s.id === selectedStudentId);
    }
    return filteredStudents;
  };

  const handleSelectSubject = (subject: string) => {
    setSelectedSubject(subject);
    setSelectedTopics([]);
    setStep("topics");
  };

  const handleToggleTopic = (topic: string) => {
    const nextTopics = selectedTopics.includes(topic)
      ? selectedTopics.filter((t) => t !== topic)
      : [...selectedTopics, topic];
    setSelectedTopics(nextTopics);
    if (nextTopics.length > 0) fetchQuestionCount(selectedSubject, nextTopics);
  };

  const handleSelectAllTopics = () => {
    const allTopics = subjectsMetadata[selectedSubject] || [];
    setSelectedTopics(allTopics);
    fetchQuestionCount(selectedSubject, allTopics);
  };

  const handleSubmit = async () => {
    const targetStudents = getTargetStudents();
    if (targetStudents.length === 0) {
      toast.error("No students in this selection to assign to");
      return;
    }

    setIsSubmitting(true);
    try {
      const assignments = targetStudents.map((student) => ({
        student_id: student.id,
        school_id: schoolId,
        created_by_teacher_id: teacherId,
        subject: selectedSubject,
        topics: selectedTopics,
        num_questions: numQuestions,
        duration: duration,
        status: "pending",
      }));

      const { error } = await supabase.from("practice_assignments").insert(assignments);
      if (error) throw error;

      toast.success(
        targetStudents.length === 1
          ? `Practice task assigned to ${targetStudents[0].name}!`
          : `Practice tasks created for ${targetStudents.length} students!`
      );

      onSuccess?.();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating assignments:", error);
      toast.error(error.message || "Failed to create practice assignment");
    } finally {
      setIsSubmitting(false);
    }
  };

  const cohortOptions: Array<"year_6" | "year_9"> = [...new Set(students.map((s) => s.class_year).filter(Boolean))] as Array<"year_6" | "year_9">;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <BookOpen className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-xl font-bold">Assign Practice Task</DialogTitle>
              <DialogDescription>
                Push targeted quiz assignments to students in your allocated classes
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex items-center justify-between py-2 border-y border-border/50 text-xs font-semibold text-muted-foreground">
          <span className={step === "target" ? "text-primary font-bold" : ""}>1. Target</span>
          <span>→</span>
          <span className={step === "subject" ? "text-primary font-bold" : ""}>2. Subject</span>
          <span>→</span>
          <span className={step === "topics" ? "text-primary font-bold" : ""}>3. Topics</span>
          <span>→</span>
          <span className={step === "config" ? "text-primary font-bold" : ""}>4. Config</span>
          <span>→</span>
          <span className={step === "summary" ? "text-primary font-bold" : ""}>5. Confirm</span>
        </div>

        {step === "target" && (
          <div className="space-y-4 py-2">
            {target && target !== "all" ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 text-sm">
                <p className="font-semibold text-foreground">{target.name}</p>
                <p className="text-xs text-muted-foreground">{target.class_name}</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <LabelWrap text="Class Year" />
                  <Select
                    value={selectedCohort}
                    onValueChange={(v: "year_6" | "year_9") => {
                      setSelectedCohort(v);
                      fetchMetadata(v);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class year" />
                    </SelectTrigger>
                    <SelectContent>
                      {cohortOptions.map((cy) => (
                        <SelectItem key={cy} value={cy}>
                          {cy === "year_6" ? "Year 6 (Primary 6)" : "Year 9 (JSS 3)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <LabelWrap text="Assign to" />
                  <div className="grid gap-2">
                    <Button
                      variant={targetType === "all" ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setTargetType("all")}
                    >
                      <Users className="mr-2 h-4 w-4" />
                      All my students ({filteredStudents.length})
                    </Button>
                    <Button
                      variant={targetType === "individual" ? "default" : "outline"}
                      className="justify-start"
                      onClick={() => setTargetType("individual")}
                    >
                      <Target className="mr-2 h-4 w-4" />
                      Individual student
                    </Button>
                  </div>
                  {targetType === "individual" && (
                    <ScrollArea className="h-48 rounded-lg border">
                      <div className="p-2 space-y-1">
                        {filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            type="button"
                            onClick={() => setSelectedStudentId(student.id)}
                            className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                              selectedStudentId === student.id
                                ? "bg-primary/10 text-primary font-semibold"
                                : "hover:bg-muted"
                            }`}
                          >
                            {student.name}
                            <span className="block text-[10px] text-muted-foreground">{student.class_name}</span>
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}
                </div>
              </>
            )}
            <DialogFooter>
              <Button
                onClick={() => setStep("subject")}
                disabled={targetType === "individual" && !selectedStudentId}
              >
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "subject" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <LabelWrap text="Select Subject" />
              <div className="grid gap-2">
                {availableSubjects.map((subject) => (
                  <Button
                    key={subject}
                    variant="outline"
                    className="justify-start"
                    onClick={() => handleSelectSubject(subject)}
                  >
                    <BookOpen className="mr-2 h-4 w-4" />
                    {subject}
                    <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
                  </Button>
                ))}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("target")}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "topics" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <LabelWrap text={`Topics for ${selectedSubject}`} />
              <ScrollArea className="h-48 rounded-lg border p-3">
                <div className="space-y-2">
                  {(subjectsMetadata[selectedSubject] || []).map((topic) => (
                    <div key={topic} className="flex items-center space-x-2">
                      <Checkbox
                        id={`topic-${topic}`}
                        checked={selectedTopics.includes(topic)}
                        onCheckedChange={() => handleToggleTopic(topic)}
                      />
                      <label htmlFor={`topic-${topic}`} className="text-sm cursor-pointer">
                        {topic}
                      </label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
              <Button variant="ghost" size="sm" onClick={handleSelectAllTopics}>
                Select all topics
              </Button>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("subject")}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep("config")} disabled={selectedTopics.length === 0}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "config" && (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <LabelWrap text={`Questions (${Math.min(numQuestions, maxAvailableQuestions)} of ${maxAvailableQuestions} available)`} />
              <Slider
                value={[numQuestions]}
                min={1}
                max={Math.max(1, maxAvailableQuestions)}
                step={1}
                onValueChange={(v) => setNumQuestions(v[0])}
              />
            </div>
            <div className="space-y-2">
              <LabelWrap text="Duration (minutes)" />
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <Slider
                  value={[duration]}
                  min={5}
                  max={120}
                  step={5}
                  onValueChange={(v) => setDuration(v[0])}
                />
                <span className="text-sm font-bold w-16 text-right">{duration} min</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("topics")}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={() => setStep("summary")}>
                Continue <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </DialogFooter>
          </div>
        )}

        {step === "summary" && (
          <div className="space-y-4 py-2">
            <div className="space-y-3 rounded-xl border bg-muted/30 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subject</span>
                <span className="font-semibold">{selectedSubject}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-muted-foreground shrink-0">Topics</span>
                <span className="text-right font-medium">{selectedTopics.join(", ")}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Questions</span>
                <span className="font-semibold">{numQuestions}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-semibold">{duration} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Students</span>
                <span className="font-semibold">{getTargetStudents().length}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setStep("config")}>
                <ChevronLeft className="mr-1 h-4 w-4" /> Back
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Confirm & Assign
                  </>
                )}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
