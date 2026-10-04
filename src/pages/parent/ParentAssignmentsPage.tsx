import { useState, useEffect, useMemo, useCallback } from "react";
import { 
  AlertTriangle, 
  CalendarClock, 
  CheckCircle2, 
  Clock3, 
  Search, 
  Sparkles, 
  Plus, 
  Loader2, 
  Bell, 
  Target, 
  Info,
  X,
  BookOpen,
  Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { useParentAccount } from "@/hooks/useParentAccount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { AssignPracticeDialog } from "@/components/AssignPracticeDialog";
import { QuestionSnapshotDialog } from "@/components/quiz/QuestionSnapshotDialog";
import { LinkedChild } from "@/types/parent";

interface AssignmentRecord {
  id: string;
  student_id: string;
  parent_id?: string | null;
  school_id?: string | null;
  subject: string;
  topics: string[];
  num_questions: number;
  duration: number;
  status: "pending" | "completed";
  score?: number | null;
  created_at: string;
  completed_at?: string | null;
  student_name?: string;
  student_user_id?: string;
  questions_snapshot?: {
    questions: any[];
    userResponses: (number | null)[];
    answers: boolean[];
    score?: number;
    totalQuestions?: number;
    completedAt?: string;
  } | null;
}

export default function ParentAssignmentsPage() {
  const { user } = useAuth();
  const { parentId, loading: parentLoading } = useParentAccount();
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<LinkedChild[]>([]);
  const [assignments, setAssignments] = useState<AssignmentRecord[]>([]);

  // Filter states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>("all");
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>("all");

  // Dialog states
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);
  const [selectedChildForAssign, setSelectedChildForAssign] = useState<LinkedChild | null>(null);
  const [detailsAssignment, setDetailsAssignment] = useState<AssignmentRecord | null>(null);
  const [sendingReminderId, setSendingReminderId] = useState<string | null>(null);

  // Review Assignment Snapshot State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewSnapshot, setReviewSnapshot] = useState<{
    questions: any[];
    userResponses: (number | null)[];
    answers: boolean[];
    subjectName: string;
    childName: string;
  } | null>(null);
  const [loadingReview, setLoadingReview] = useState(false);

  const handleReviewAssignment = async (item: AssignmentRecord) => {
    // 1. If questions_snapshot exists, use it directly with guaranteed chronological order
    if (item.questions_snapshot?.questions?.length) {
      const snap = item.questions_snapshot;
      const sortedQuestions = [...snap.questions].sort((a: any, b: any) => {
        const orderA = a.question_number ?? a.original_order ?? 0;
        const orderB = b.question_number ?? b.original_order ?? 0;
        return orderA - orderB;
      });

      const sortedAnswers = sortedQuestions.map((q: any, i: number) =>
        q.isCorrect !== undefined ? q.isCorrect : (snap.answers?.[i] ?? false)
      );
      const sortedResponses = sortedQuestions.map((q: any, i: number) =>
        q.userResponse !== undefined ? q.userResponse : (snap.userResponses?.[i] ?? null)
      );

      setReviewSnapshot({
        questions: sortedQuestions,
        userResponses: sortedResponses,
        answers: sortedAnswers,
        subjectName: item.subject,
        childName: item.student_name || "Child",
      });
      setReviewModalOpen(true);
      return;
    }

    // 2. Fallback: query matching questions from database
    setLoadingReview(true);
    try {
      const { data: student } = await supabase
        .from("students")
        .select("class_year")
        .eq("id", item.student_id)
        .maybeSingle();

      const classYear = student?.class_year || "year_6";
      const tableName = classYear === "year_6" ? "quiz_questions_year6" : "quiz_questions_year9";
      const optionsTableName = classYear === "year_6" ? "quiz_options_year6" : "quiz_options_year9";
      const passageTableName = classYear === "year_6" ? "comprehension_passages_year6" : "comprehension_passages_year9";

      let query = supabase.from(tableName).select(`*, passage:${passageTableName}(title, passage_text)`);
      if (item.subject) query = query.eq("subject", item.subject);
      if (item.topics?.length) query = query.in("topic", item.topics);

      const { data: qData, error: qErr } = await query.limit(item.num_questions || 10);
      if (qErr || !qData || qData.length === 0) {
        toast.info("No questions found for this assignment topic.");
        return;
      }

      const qIds = qData.map((q: any) => q.id);
      const { data: optData } = await supabase.from(optionsTableName).select("*").in("question_id", qIds).order("display_order");
      const optMap = (optData || []).reduce((acc: any, opt: any) => {
        if (!acc[opt.question_id]) acc[opt.question_id] = [];
        acc[opt.question_id].push(opt);
        return acc;
      }, {});

      const fallbackQuestions = qData.map((q: any) => {
        const opts = optMap[q.id] || [];
        const corrIdx = opts.findIndex((o: any) => o.is_correct);
        return {
          id: q.id,
          question: q.question_text,
          options: opts.map((o: any) => ({ text: o.option_text, image_url: o.image_url || null })),
          correctAnswer: corrIdx >= 0 ? corrIdx : 0,
          explanation: q.explanation || "No explanation provided.",
          subject: q.subject,
          image_url: q.image_url || null,
          passage: q.passage || null,
        };
      });

      setReviewSnapshot({
        questions: fallbackQuestions,
        userResponses: fallbackQuestions.map((q) => (item.score && item.score >= 50 ? q.correctAnswer : null)),
        answers: fallbackQuestions.map(() => true),
        subjectName: item.subject,
        childName: item.student_name || "Child",
      });
      setReviewModalOpen(true);
    } catch (err) {
      console.error("Error loading assignment review:", err);
      toast.error("Could not load question snapshot.");
    } finally {
      setLoadingReview(false);
    }
  };

  const fetchAssignmentsData = useCallback(async (pId: string) => {
    try {
      setLoading(true);

      // Fetch linked children
      const { data: childrenData, error: childrenError } = await supabase
        .from("students")
        .select("id, user_id, class_year, is_premium, profile:profiles(full_name, unique_id, username)")
        .eq("parent_id", pId);

      if (childrenError) throw childrenError;

      const typedChildren = (childrenData || []) as unknown as LinkedChild[];
      setChildren(typedChildren);
      if (typedChildren.length > 0) {
        // Preselect the first child once; the setter is stable and the value is
        // read via the ref below to avoid a self-retriggering fetch loop.
        setSelectedChildForAssign((current) => current ?? typedChildren[0]);
      }

      const studentMap = new Map<string, { name: string; userId: string }>();
      typedChildren.forEach((c) => {
        studentMap.set(c.id, {
          name: c.profile?.full_name || "Unknown Student",
          userId: c.user_id,
        });
      });

      // Fetch practice assignments
      const { data: assignmentsData, error: assignmentsError } = await supabase
        .from("practice_assignments")
        .select("*")
        .eq("parent_id", pId)
        .order("created_at", { ascending: false });

      if (assignmentsError) throw assignmentsError;

      const mappedAssignments = (assignmentsData || []).map((a) => {
        const studentInfo = studentMap.get(a.student_id);
        return {
          ...a,
          status: a.status === "completed" ? "completed" : "pending",
          student_name: studentInfo?.name || "Student",
          student_user_id: studentInfo?.userId,
        };
      });

      setAssignments(mappedAssignments as unknown as AssignmentRecord[]);
    } catch (error) {
      console.error("Error loading assignments:", error);
      toast.error("Failed to load assignments");
    } finally {
      setLoading(false);
    }
    // Deps intentionally exclude selectedChildForAssign: the initial selection
    // set above must not re-trigger the fetch.
  }, []);

  useEffect(() => {
    if (parentId) {
      fetchAssignmentsData(parentId);
    } else if (!parentLoading) {
      setLoading(false);
    }
  }, [parentId, parentLoading, fetchAssignmentsData]);

  // Distinct subjects for filter
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    assignments.forEach((a) => {
      if (a.subject) subjects.add(a.subject);
    });
    return Array.from(subjects).sort();
  }, [assignments]);

  // Filtered assignments
  const filteredAssignments = useMemo(() => {
    return assignments.filter((a) => {
      if (selectedStudentFilter !== "all" && a.student_id !== selectedStudentFilter) {
        return false;
      }
      if (selectedSubjectFilter !== "all" && a.subject !== selectedSubjectFilter) {
        return false;
      }
      if (selectedStatusFilter !== "all" && a.status !== selectedStatusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchesSubject = a.subject.toLowerCase().includes(query);
        const matchesStudent = (a.student_name || "").toLowerCase().includes(query);
        const matchesTopics = (a.topics || []).some((t) => t.toLowerCase().includes(query));
        if (!matchesSubject && !matchesStudent && !matchesTopics) {
          return false;
        }
      }
      return true;
    });
  }, [assignments, selectedStudentFilter, selectedSubjectFilter, selectedStatusFilter, searchQuery]);

  // Categorize
  const { needsAttention, upcoming, completed } = useMemo(() => {
    const now = Date.now();
    const twoDaysMs = 2 * 24 * 60 * 60 * 1000;

    const needs: AssignmentRecord[] = [];
    const up: AssignmentRecord[] = [];
    const comp: AssignmentRecord[] = [];

    filteredAssignments.forEach((a) => {
      const createdAt = new Date(a.created_at).getTime();
      const isPastDue = a.status === "pending" && (now - createdAt > twoDaysMs);
      const isLowScore = a.status === "completed" && typeof a.score === "number" && a.score < 50;

      if (isPastDue || isLowScore) {
        needs.push(a);
      } else if (a.status === "pending") {
        up.push(a);
      } else {
        comp.push(a);
      }
    });

    return { needsAttention: needs, upcoming: up, completed: comp };
  }, [filteredAssignments]);

  const handleRemindChild = async (assignment: AssignmentRecord) => {
    if (!assignment.student_user_id) {
      toast.error("Could not find student account to send reminder");
      return;
    }

    try {
      setSendingReminderId(assignment.id);
      const { error } = await supabase.from("notifications").insert({
        user_id: assignment.student_user_id,
        title: "Assignment Reminder",
        message: `Friendly reminder from your parent: Please complete your practice task for ${assignment.subject}.`,
        type: "parent_assignment",
        read: false,
        metadata: {
          assignment_id: assignment.id,
          subject: assignment.subject,
        },
      });

      if (error) throw error;
      toast.success(`Reminder sent to ${assignment.student_name}!`);
    } catch (err) {
      console.error("Error sending reminder:", err);
      toast.error("Failed to send reminder notification");
    } finally {
      setSendingReminderId(null);
    }
  };

  const getRelativeTime = (dateStr: string) => {
    try {
      return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="w-full px-3 pb-20 pt-6 md:px-6">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <div className="parent-section-chip">Academic Service</div>
          <h1 className="mt-4 text-4xl font-black tracking-tight text-foreground md:text-5xl">
            Assignments Manager
          </h1>
          <p className="mt-2 text-base text-muted-foreground">
            Track, assign, and manage practice tasks and quizzes for your children.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            onClick={() => setAssignDialogOpen(true)}
            disabled={children.length === 0}
            className="h-12 rounded-xl bg-primary px-5 text-sm font-black text-primary-foreground shadow-lg shadow-primary/20 hover:opacity-90 transition-all"
          >
            <Plus className="mr-2 h-5 w-5" />
            Assign Practice Task
          </Button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="mb-8 flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/40 p-3 backdrop-blur-sm">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search assignments by subject, topic, or child..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="parent-search h-11 bg-background/50 pl-10 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Student Filter */}
        <Select value={selectedStudentFilter} onValueChange={setSelectedStudentFilter}>
          <SelectTrigger className="h-11 min-w-[150px] rounded-xl border-border/60 bg-background/50 font-bold text-xs">
            <SelectValue placeholder="All Students" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="font-bold text-xs">All Students</SelectItem>
            {children.map((c) => (
              <SelectItem key={c.id} value={c.id} className="font-bold text-xs">
                {c.profile?.full_name || "Child"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Subject Filter */}
        <Select value={selectedSubjectFilter} onValueChange={setSelectedSubjectFilter}>
          <SelectTrigger className="h-11 min-w-[140px] rounded-xl border-border/60 bg-background/50 font-bold text-xs">
            <SelectValue placeholder="All Subjects" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="font-bold text-xs">All Subjects</SelectItem>
            {availableSubjects.map((sub) => (
              <SelectItem key={sub} value={sub} className="font-bold text-xs">
                {sub}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Filter */}
        <Select value={selectedStatusFilter} onValueChange={setSelectedStatusFilter}>
          <SelectTrigger className="h-11 min-w-[130px] rounded-xl border-border/60 bg-background/50 font-bold text-xs">
            <SelectValue placeholder="Status: Any" />
          </SelectTrigger>
          <SelectContent className="rounded-xl">
            <SelectItem value="all" className="font-bold text-xs">Status: Any</SelectItem>
            <SelectItem value="pending" className="font-bold text-xs">Pending</SelectItem>
            <SelectItem value="completed" className="font-bold text-xs">Completed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 space-y-4">
          <Loader2 className="h-10 w-10 text-primary animate-spin" />
          <p className="text-muted-foreground font-medium animate-pulse">Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <Card className="rounded-[2.5rem] border-3 border-dashed border-border/60 bg-muted/10 p-16 flex flex-col items-center justify-center text-center space-y-6">
          <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
            <BookOpen className="h-10 w-10 text-primary" />
          </div>
          <div className="space-y-2 max-w-md">
            <h2 className="text-2xl font-black tracking-tight">No Practice Tasks Assigned Yet</h2>
            <p className="text-muted-foreground font-medium text-sm leading-relaxed">
              Create structured homework or practice sets tailored to your child’s exam syllabus (Common Entrance or BECE).
            </p>
          </div>
          <Button
            onClick={() => setAssignDialogOpen(true)}
            disabled={children.length === 0}
            className="rounded-2xl h-13 px-8 font-black text-base shadow-xl shadow-primary/20"
          >
            <Plus className="mr-2 h-5 w-5" />
            Assign First Practice Task
          </Button>
        </Card>
      ) : filteredAssignments.length === 0 ? (
        <Card className="rounded-[2rem] border border-border/60 bg-card/40 p-12 text-center space-y-3">
          <p className="text-lg font-bold text-foreground">No assignments match your active filters</p>
          <p className="text-sm text-muted-foreground">Try clearing the search query or adjusting your filters.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSearchQuery("");
              setSelectedStudentFilter("all");
              setSelectedSubjectFilter("all");
              setSelectedStatusFilter("all");
            }}
            className="rounded-xl mt-2"
          >
            Reset Filters
          </Button>
        </Card>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.4fr_1fr]">
          <div className="space-y-6">
            {/* Needs Attention Section */}
            {needsAttention.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-6 w-6 text-[#ff5d67]" />
                  <h2 className="text-2xl font-black tracking-tight text-foreground">Needs Attention</h2>
                  <Badge variant="outline" className="border-[#ff5d67]/40 bg-[#ff5d67]/10 text-[#ff5d67] font-black text-xs">
                    {needsAttention.length}
                  </Badge>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  {needsAttention.map((item) => (
                    <Card key={item.id} className="parent-panel rounded-[1.5rem] border border-[#ff5d67]/40 bg-[#ff5d67]/5 p-0">
                      <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div>
                          <div className="mb-4 flex items-center justify-between">
                            <span className="rounded-full bg-[#ff5d67]/15 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-[#ff6a70]">
                              {item.status === "completed" ? "Low Score" : "Needs Attention"}
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {getRelativeTime(item.created_at)}
                            </span>
                          </div>

                          <h3 className="text-2xl font-black leading-tight text-foreground">{item.subject}</h3>

                          <div className="mt-2 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{item.student_name}</span> · {item.num_questions} Questions
                          </div>

                          {item.topics && item.topics.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {item.topics.slice(0, 2).map((t) => (
                                <span key={t} className="rounded-md bg-background/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {t}
                                </span>
                              ))}
                              {item.topics.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">+{item.topics.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          {item.status === "pending" ? (
                            <Button
                              variant="outline"
                              onClick={() => handleRemindChild(item)}
                              disabled={sendingReminderId === item.id}
                              className="rounded-xl border-[#ff5d67]/30 bg-[#ff5d67]/10 font-black text-[#ff6a70] hover:bg-[#ff5d67]/20 text-xs"
                            >
                              {sendingReminderId === item.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <Bell className="mr-1.5 h-3.5 w-3.5" />
                                  Remind Child
                                </>
                              )}
                            </Button>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-500 font-black text-xs justify-center rounded-xl py-2">
                              Score: {item.score}%
                            </Badge>
                          )}
                          <Button
                            variant="ghost"
                            onClick={() => setDetailsAssignment(item)}
                            className="rounded-xl border border-border/60 bg-background/30 font-semibold text-foreground text-xs"
                          >
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Upcoming / In Progress Section */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center gap-3">
                <CalendarClock className="h-6 w-6 text-primary" />
                <h2 className="text-2xl font-black tracking-tight text-foreground">In Progress Tasks</h2>
                <Badge variant="outline" className="font-black text-xs">
                  {upcoming.length}
                </Badge>
              </div>

              {upcoming.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/60 p-6 text-center text-sm text-muted-foreground">
                  No pending tasks in this category.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {upcoming.map((item) => (
                    <Card key={item.id} className="parent-panel rounded-[1.5rem] border border-border/60 bg-card/60 p-0">
                      <CardContent className="p-5 flex flex-col justify-between h-full">
                        <div>
                          <div className="mb-4 flex items-center justify-between">
                            <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                              Pending
                            </span>
                            <span className="text-xs font-semibold text-muted-foreground">
                              {getRelativeTime(item.created_at)}
                            </span>
                          </div>

                          <h3 className="text-2xl font-black leading-tight text-foreground">{item.subject}</h3>
                          <div className="mt-2 text-sm text-muted-foreground">
                            <span className="font-semibold text-foreground">{item.student_name}</span> · {item.num_questions} Questions · {item.duration} mins
                          </div>

                          {item.topics && item.topics.length > 0 && (
                            <div className="mt-3 flex flex-wrap gap-1">
                              {item.topics.slice(0, 2).map((t) => (
                                <span key={t} className="rounded-md bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                                  {t}
                                </span>
                              ))}
                              {item.topics.length > 2 && (
                                <span className="text-[10px] text-muted-foreground">+{item.topics.length - 2} more</span>
                              )}
                            </div>
                          )}
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <Button
                            variant="outline"
                            onClick={() => handleRemindChild(item)}
                            disabled={sendingReminderId === item.id}
                            className="rounded-xl border-border/60 bg-background/30 font-semibold text-foreground text-xs"
                          >
                            {sendingReminderId === item.id ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <>
                                <Bell className="mr-1.5 h-3.5 w-3.5 text-primary" />
                                Remind
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            onClick={() => setDetailsAssignment(item)}
                            className="rounded-xl border border-border/60 bg-background/30 font-semibold text-foreground text-xs"
                          >
                            Details
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Completed / Recent Submissions */}
          <div className="space-y-6">
            <div className="rounded-[1.8rem] border border-border/60 bg-card/60 p-5 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <h3 className="text-2xl font-black text-foreground">Completed Tasks</h3>
                </div>
                <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-xs">
                  {completed.length} Done
                </Badge>
              </div>

              {completed.length === 0 ? (
                <div className="py-8 text-center text-sm text-muted-foreground">
                  No completed tasks yet. Completed assignments will appear here with grades.
                </div>
              ) : (
                <div className="space-y-3">
                  {completed.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => setDetailsAssignment(item)}
                      className="group flex items-center justify-between rounded-2xl border border-border/60 bg-background/40 p-4 transition-all hover:border-primary/40 cursor-pointer"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-foreground">{item.subject}</span>
                          <span className="text-[10px] text-muted-foreground font-medium">• {item.student_name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {item.completed_at ? `Completed ${getRelativeTime(item.completed_at)}` : "Finished"}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge className="bg-emerald-500/10 text-emerald-600 border-none font-black text-sm px-2.5 py-1">
                          {typeof item.score === "number" ? `${item.score}%` : "Done"}
                        </Badge>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={loadingReview}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleReviewAssignment(item);
                          }}
                          className="h-8 px-2.5 text-xs font-bold gap-1 rounded-xl border-primary/25 text-primary hover:bg-primary/10 transition-colors shadow-none"
                          title="Review questions and answers"
                        >
                          {loadingReview ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <Eye className="w-3.5 h-3.5" />
                          )}
                          Review
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Panel */}
            <div className="rounded-[1.8rem] border border-border/60 bg-primary/5 p-5">
              <div className="mb-2 flex items-center gap-2 text-primary font-black text-sm uppercase tracking-wider">
                <Sparkles className="h-4 w-4" />
                Targeted Practice
              </div>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Assigning 10 to 15 questions 3 times a week improves student retention by up to 40% before BECE exams.
              </p>
              <Button
                onClick={() => setAssignDialogOpen(true)}
                disabled={children.length === 0}
                className="mt-4 w-full rounded-xl bg-primary text-primary-foreground font-black text-sm"
              >
                Create New Drill Set
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Assignment Details Dialog */}
      <Dialog open={!!detailsAssignment} onOpenChange={(open) => !open && setDetailsAssignment(null)}>
        <DialogContent className="sm:max-w-[480px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black">Assignment Details</DialogTitle>
            <DialogDescription>
              Task specifications and progress record
            </DialogDescription>
          </DialogHeader>

          {detailsAssignment && (
            <div className="space-y-4 py-2">
              <div className="rounded-2xl bg-muted/30 p-4 space-y-2 border border-border/50">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student</span>
                  <span className="font-bold text-foreground">{detailsAssignment.student_name}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Subject</span>
                  <span className="font-bold text-foreground">{detailsAssignment.subject}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Status</span>
                  <Badge variant={detailsAssignment.status === "completed" ? "default" : "outline"} className="font-black text-xs">
                    {detailsAssignment.status.toUpperCase()}
                  </Badge>
                </div>
                {typeof detailsAssignment.score === "number" && (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Score</span>
                    <span className="font-black text-emerald-500 text-lg">{detailsAssignment.score}%</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Questions</span>
                  <span className="font-medium text-foreground">{detailsAssignment.num_questions} Questions</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Duration</span>
                  <span className="font-medium text-foreground">{detailsAssignment.duration} Minutes</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Date</span>
                  <span className="font-medium text-muted-foreground text-xs">
                    {format(new Date(detailsAssignment.created_at), "MMM d, yyyy h:mm a")}
                  </span>
                </div>
              </div>

              {detailsAssignment.topics && detailsAssignment.topics.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Included Topics</label>
                  <div className="flex flex-wrap gap-1.5">
                    {detailsAssignment.topics.map((t, i) => (
                      <span key={i} className="rounded-xl border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium">
                        {t}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {detailsAssignment.status === "completed" && (
                <div className="pt-2">
                  <Button
                    variant="default"
                    onClick={() => {
                      const target = detailsAssignment;
                      setDetailsAssignment(null);
                      handleReviewAssignment(target);
                    }}
                    className="w-full gap-2 font-bold bg-primary text-primary-foreground shadow-md h-11 rounded-2xl"
                  >
                    <Eye className="w-4 h-4" />
                    Review Questions & Solutions
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter className="sm:justify-between">
            {detailsAssignment?.status === "pending" && (
              <Button
                variant="outline"
                onClick={() => {
                  if (detailsAssignment) handleRemindChild(detailsAssignment);
                }}
                disabled={sendingReminderId === detailsAssignment?.id}
                className="rounded-xl font-bold"
              >
                <Bell className="mr-1.5 h-4 w-4 text-primary" />
                Send Reminder
              </Button>
            )}
            <Button
              variant="hero"
              onClick={() => setDetailsAssignment(null)}
              className="rounded-xl font-bold ml-auto"
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Assign Practice Dialog */}
      {selectedChildForAssign && (
        <AssignPracticeDialog
          open={assignDialogOpen}
          onOpenChange={setAssignDialogOpen}
          child={selectedChildForAssign}
          onSuccess={() => {
            if (parentId) fetchAssignmentsData(parentId);
          }}
        />
      )}

      {/* Question Snapshot Review Dialog for Parent */}
      {reviewSnapshot && (
        <QuestionSnapshotDialog
          open={reviewModalOpen}
          onOpenChange={setReviewModalOpen}
          questions={reviewSnapshot.questions}
          userResponses={reviewSnapshot.userResponses}
          answers={reviewSnapshot.answers}
          subjectName={reviewSnapshot.subjectName}
          isParentView={true}
          childName={reviewSnapshot.childName}
        />
      )}
    </div>
  );
}
