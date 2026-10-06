import { useState, useEffect, useCallback } from "react";
import { Users, TrendingUp, Plus, Award, Target, ChevronRight, AlertTriangle, Search, Bell, Settings, BookOpen, FileText, Zap, BarChart3, MessageCircle, Copy, Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useParentAccount } from "@/hooks/useParentAccount";
import { useChildrenData } from "@/hooks/useChildrenData";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { AssignPracticeDialog } from "@/components/AssignPracticeDialog";
import { ChildOverviewCard } from "@/components/parent/ChildOverviewCard";
import { DummyPaymentModal } from "@/components/parent/DummyPaymentModal";
import { ParentActivityFeed } from "@/components/parent/ParentActivityFeed";
import { PortalDataState } from "@/components/PortalDataState";
import { DeleteChildDialog } from "@/components/parent/DeleteChildDialog";
import { AddChildDialog } from "@/components/parent/AddChildDialog";
import { EditChildNameDialog } from "@/components/parent/EditChildNameDialog";
import { EditChildUsernameDialog } from "@/components/parent/EditChildUsernameDialog";
import { ChangeChildPasswordDialog } from "@/components/parent/ChangeChildPasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LinkedChild, ChildAnalytics, QuizResult, Assignment } from "@/types/parent";
import { getEdgeFunctionError } from "@/lib/errorUtils";
import { QuestionSnapshotDialog } from "@/components/quiz/QuestionSnapshotDialog";
import { WeeklyGrowthDigestCard } from "@/components/parent/WeeklyGrowthDigestCard";
import { calculateStudentLevel } from "@/services/gamification/levelEngine";
import { LEAGUE_TIERS } from "@/services/gamification/leagueEngine";
import { LeagueTierNumber } from "@/services/gamification/types";
import eclatlLogo from "@/assets/logo.png";

const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

export default function ParentDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [reportOpen, setReportOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);
  const [addChildOpen, setAddChildOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [selectedPaymentChild, setSelectedPaymentChild] = useState<{ id: string; name: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [managedChild, setManagedChild] = useState<LinkedChild | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editUsernameOpen, setEditUsernameOpen] = useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [activeChildIndex, setActiveChildIndex] = useState(0);

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

  const handleReviewAssignment = async (assignment: Assignment, childName: string) => {
    // 1. If questions_snapshot exists, use it directly with guaranteed chronological order
    if (assignment.questions_snapshot?.questions?.length) {
      const snap = assignment.questions_snapshot;
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
        subjectName: assignment.subject,
        childName,
      });
      setReviewModalOpen(true);
      return;
    }

    // 2. Fallback: fetch matching questions for this assignment's topics and subject
    setLoadingReview(true);
    try {
      const { data: student } = await supabase
        .from("students")
        .select("class_year")
        .eq("id", assignment.student_id)
        .maybeSingle();

      const classYear = student?.class_year || "year_6";
      const tableName = classYear === "year_6" ? "quiz_questions_year6" : "quiz_questions_year9";
      const optionsTableName = classYear === "year_6" ? "quiz_options_year6" : "quiz_options_year9";
      const passageTableName = classYear === "year_6" ? "comprehension_passages_year6" : "comprehension_passages_year9";

      let query = supabase.from(tableName).select(`*, passage:${passageTableName}(title, passage_text)`);
      if (assignment.subject) query = query.eq("subject", assignment.subject);
      if (assignment.topics?.length) query = query.in("topic", assignment.topics);

      const { data: qData, error: qErr } = await query.limit(assignment.num_questions || 10);
      if (qErr || !qData || qData.length === 0) {
        toast.info("No question snapshot found for this assignment.");
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
        userResponses: fallbackQuestions.map((q, i) => (assignment.score && assignment.score >= 50 ? q.correctAnswer : null)),
        answers: fallbackQuestions.map(() => true),
        subjectName: assignment.subject,
        childName,
      });
      setReviewModalOpen(true);
    } catch (err) {
      console.error("Error loading assignment review:", err);
      toast.error("Could not load question snapshot.");
    } finally {
      setLoadingReview(false);
    }
  };

  // Shared cached children dataset (children + analytics + assignments +
  // gamification enrichment + recent activity feed)
  const { parentId, parentCode, loading: parentAccountLoading } = useParentAccount();
  const {
    children,
    childrenAnalytics,
    childrenAssignments,
    globalActivities,
    isLoading,
    error: childrenError,
    refresh: refreshChildren,
  } = useChildrenData(parentId, { withGamification: true });

  const linkedChildren: LinkedChild[] = children.map((child) => ({
    ...child,
    assignments: (childrenAssignments.get(child.id) || []).slice(0, 5),
  }));

  const [copiedCode, setCopiedCode] = useState(false);

  // Derived Top-Level Metrics
  const totalChildren = linkedChildren.length;
  const premiumChildrenCount = linkedChildren.filter(c => c.is_premium).length;

  let totalQuizzesGlobal = 0;
  let totalScoreGlobal = 0;

  childrenAnalytics.forEach(analytics => {
    totalQuizzesGlobal += analytics.totalQuizzes;
    totalScoreGlobal += (analytics.averageScore * analytics.totalQuizzes); // Weighted sum
  });

  const overallAverage = totalQuizzesGlobal > 0 ? Math.round(totalScoreGlobal / totalQuizzesGlobal) : 0;

  const handleCopyCode = async () => {
    if (parentCode) {
      await navigator.clipboard.writeText(parentCode);
      setCopiedCode(true);
      toast.success("Link code copied to clipboard!");
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };


  useEffect(() => {
    if (!parentId && !parentAccountLoading) {
      // Parent account could not be resolved; nothing further to load.
    }
  }, [parentId, parentAccountLoading]);

  const handleDeleteChild = async () => {
    if (!managedChild) return;

    setIsDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-student-account", {
        body: { studentId: managedChild.id },
      });

      if (error) {
        const message = await getEdgeFunctionError(error, "Failed to delete student account");
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);

      toast.success(`${managedChild.profile.full_name}'s account deleted.`);
      setDeleteDialogOpen(false);
      setManagedChild(null);

      if (parentId) {
        await refreshChildren();
      }
    } catch (error: unknown) {
      console.error("Error deleting child:", error);
      toast.error(error instanceof Error ? error.message : "Failed to delete student account");
    } finally {
      setIsDeleting(false);
    }
  };

  // Failures must not masquerade as an empty family.
  if (parentAccountLoading || isLoading) {
    return <PortalDataState loading />;
  }
  if (childrenError) {
    return <PortalDataState error={childrenError} onRetry={refreshChildren} />;
  }

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in">
      {/* Welcome Section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
            <Award className="h-3.5 w-3.5" />
            <span>Family Portal</span>
          </div>
          <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
            Parent Overview<span className="text-primary">.</span>
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
            Empower your children's BECE &amp; Common Entrance preparation with real-time analytics.
          </p>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            variant="outline"
            onClick={() => navigate("/dashboard/parent/reports")}
            className="text-xs sm:text-sm"
          >
            View Reports
          </Button>
          <Button
            onClick={() => setAddChildOpen(true)}
            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm shadow-sm"
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Child
          </Button>
        </div>
      </div>

      {/* Top-Level Overview Metrics */}
      {!isLoading && linkedChildren.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-2xl min-w-0 hover:border-primary/40 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Children</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-foreground">{totalChildren}</p>
                <p className="text-[11px] text-primary mt-0.5 font-medium">Enrolled</p>
              </div>
              <div className="p-3 bg-primary/10 text-primary rounded-xl flex-shrink-0">
                <Users className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-2xl min-w-0 hover:border-emerald-500/40 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Avg Score</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-foreground">{overallAverage}%</p>
                <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-0.5 font-medium">Overall Accuracy</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-xl flex-shrink-0">
                <TrendingUp className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-2xl min-w-0 hover:border-violet-500/40 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Quizzes</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-foreground">{totalQuizzesGlobal}</p>
                <p className="text-[11px] text-violet-600 dark:text-violet-400 mt-0.5 font-medium">Completed</p>
              </div>
              <div className="p-3 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-xl flex-shrink-0">
                <Target className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>

          <Card className="border border-border bg-card text-card-foreground shadow-sm rounded-2xl min-w-0 hover:border-amber-500/40 transition-colors">
            <CardContent className="p-4 sm:p-5 flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">Plan</p>
                <p className="mt-1 text-2xl sm:text-3xl font-black text-foreground">
                  {premiumChildrenCount} <span className="text-xs font-bold text-amber-500">VIP</span>
                </p>
                <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">Premium Learners</p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl flex-shrink-0">
                <Award className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Weekly Parent Growth Digest (PRD §10.1 & Phase 3 Epic PAR-01) */}
      {!isLoading && linkedChildren.length > 0 && parentId && (
        <div className="mb-8">
          <WeeklyGrowthDigestCard
            parentId={parentId}
            studentId={linkedChildren[0].id}
            studentName={linkedChildren[0].profile?.full_name || "Your Child"}
          />
        </div>
      )}

      {/* Children Overview */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground text-sm">Loading your family data...</p>
        </div>
      ) : linkedChildren.length === 0 ? (
        <Card className="border-2 border-dashed border-border bg-card text-card-foreground shadow-sm rounded-2xl">
          <CardContent className="py-16 text-center flex flex-col items-center justify-center">
            <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-5">
              <Users className="h-10 w-10" />
            </div>
            <h3 className="text-xl sm:text-2xl font-bold text-foreground mb-2">Welcome to your Parent Portal!</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto text-xs sm:text-sm">
              Connect or create an account for your child. Once linked, you can monitor exam readiness, track strengths, and assign targeted drills.
            </p>
            <Button
              onClick={() => setAddChildOpen(true)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold px-6 py-2.5 rounded-xl shadow-md"
            >
              <Plus className="mr-2 h-4 w-4" />
              Create First Child Account
            </Button>

            {parentCode && (
              <div className="mt-8 pt-6 border-t border-border max-w-sm w-full">
                <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">Or link existing student account</p>
                <p className="text-xs text-muted-foreground mb-3">Share this Link Code with your child:</p>
                <code className="block border border-dashed border-primary/30 bg-muted/50 px-3 py-3 text-center text-xl font-bold tracking-[0.25em] text-primary rounded-xl select-all">
                  {parentCode}
                </code>
                <Button
                  onClick={handleCopyCode}
                  variant="outline"
                  size="sm"
                  className="mt-3 w-full border-border bg-card hover:bg-accent font-semibold"
                >
                  {copiedCode ? (
                    <>
                      <Check className="mr-2 h-4 w-4 text-emerald-500" />
                      copied
                    </>
                  ) : (
                    <>
                      <Copy className="mr-2 h-4 w-4 text-primary" />
                      copy code
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-8 sm:gap-10">
          {/* Recent Activities & Parent Link Code Section (Matching Student Dashboard) */}
          <section className="grid gap-6 lg:grid-cols-[1fr_300px]">
            {/* Activity Feed Section */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="h-5 w-1 bg-primary rounded-full" />
                  <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Recent Activities</h3>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/dashboard/parent/activities")}
                  className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
                >
                  View All <ChevronRight className="ml-1 h-3.5 w-3.5" />
                </Button>
              </div>
              <ParentActivityFeed activities={globalActivities} isLoading={isLoading} />
            </div>

            {/* Parent Link Code Card - Matching Student Dashboard */}
            <div className="space-y-4 flex flex-col">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-primary rounded-full" />
                <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Your Link Code</h3>
              </div>
              <div className="rounded-2xl border border-border bg-card p-5 text-card-foreground shadow-sm flex flex-col justify-between flex-1">
                <div>
                  <h2 className="text-base sm:text-lg font-semibold text-foreground">Your Link Code</h2>
                  <p className="mt-1 text-xs text-muted-foreground">Share this code with your child to connect accounts</p>
                  {parentCode ? (
                    <>
                      <code className="mt-5 block border border-dashed border-primary/30 bg-muted/50 px-3 py-4 text-center text-2xl font-bold tracking-[0.25em] text-primary rounded-xl select-all">
                        {parentCode}
                      </code>
                      <Button
                        onClick={handleCopyCode}
                        variant="outline"
                        className="mt-3 w-full border-border bg-card hover:bg-accent font-semibold"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-emerald-500" />
                            copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4 text-primary" />
                            copy code
                          </>
                        )}
                      </Button>
                    </>
                  ) : (
                    <p className="mt-6 text-sm text-muted-foreground">Your link code will appear here.</p>
                  )}
                </div>

                <div className="mt-6 pt-4 border-t border-border space-y-1.5 text-xs text-muted-foreground">
                  <p className="flex items-center gap-2 text-foreground font-medium">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    How to connect:
                  </p>
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Children can link your account by entering this code in their dashboard under settings or during sign-up.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* My Children Section */}
          <div id="children" className="space-y-4 scroll-mt-24">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="h-5 w-1 bg-primary rounded-full" />
                <h3 className="text-lg sm:text-xl font-black text-foreground tracking-tight">My Children</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate("/dashboard/parent/children")}
                className="text-xs font-semibold text-primary hover:text-primary hover:bg-primary/10 rounded-xl"
              >
                View All <ChevronRight className="ml-1 h-3.5 w-3.5" />
              </Button>
            </div>

            {linkedChildren.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {linkedChildren.map((child, index) => {
                  const isActive = (activeChildIndex === index) || (activeChildIndex >= linkedChildren.length && index === 0);
                  return (
                    <Button
                      key={child.id}
                      variant={isActive ? "default" : "outline"}
                      size="sm"
                      onClick={() => setActiveChildIndex(index)}
                      className={`rounded-xl font-bold text-xs transition-all ${isActive ? 'bg-primary text-primary-foreground shadow-sm' : 'border-border/60 hover:bg-primary/10'}`}
                    >
                      {child.profile?.full_name || `Child ${index + 1}`}
                      {child.is_premium && (
                        <span className="ml-1.5 rounded-full bg-amber-500/20 px-1.5 py-0.2 text-[9px] font-black text-amber-500">PRO</span>
                      )}
                    </Button>
                  );
                })}
              </div>
            )}

            <div className="grid grid-cols-1 gap-6">
              {(() => {
                const effectiveIndex = activeChildIndex < linkedChildren.length ? activeChildIndex : 0;
                const child = linkedChildren[effectiveIndex];
                if (!child) return null;
                return (
                  <ChildOverviewCard
                    key={child.id}
                    child={child}
                    index={effectiveIndex}
                    analytics={childrenAnalytics.get(child.id)}
                    assignments={child.assignments}
                    onViewReport={(c) => {
                      setSelectedChild(c);
                      setReportOpen(true);
                    }}
                    onAssignPractice={(c) => {
                      setSelectedChild(c);
                      setAssignOpen(true);
                    }}
                    onUpgradePremium={(c) => {
                      setSelectedPaymentChild({ id: c.id, name: c.profile.full_name || "Unknown" });
                      setPaymentModalOpen(true);
                    }}
                    onDeleteChild={(c) => {
                      setManagedChild(c);
                      setDeleteDialogOpen(true);
                    }}
                    onEditName={(c) => {
                      setManagedChild(c);
                      setEditNameOpen(true);
                    }}
                    onEditUsername={(c) => {
                      setManagedChild(c);
                      setEditUsernameOpen(true);
                    }}
                    onChangePassword={(c) => {
                      setManagedChild(c);
                      setChangePasswordOpen(true);
                    }}
                    onReviewAssignment={handleReviewAssignment}
                  />
                );
              })()}
            </div>
          </div>
        </div>
      )}


      <StudentReportDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        studentId={selectedChild?.id || ""}
        studentName={selectedChild?.profile.full_name || ""}
        studentClass={selectedChild?.class_year === "year_6" ? "Year 6" : "Year 9"}
        avatar={selectedChild?.profile.full_name?.charAt(0).toUpperCase() || "?"}
      />
      <AssignPracticeDialog
        open={assignOpen}
        onOpenChange={setAssignOpen}
        child={selectedChild}
      />

      <AddChildDialog
        open={addChildOpen}
        onOpenChange={setAddChildOpen}
        parentId={parentId}
        onSuccess={() => refreshChildren()}
      />

      <DummyPaymentModal
        open={paymentModalOpen}
        onOpenChange={setPaymentModalOpen}
        studentId={selectedPaymentChild?.id || ""}
        studentName={selectedPaymentChild?.name || ""}
        onSuccess={() => {
          refreshChildren();
        }}
      />

      <DeleteChildDialog
        isOpen={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        child={managedChild}
        onConfirm={handleDeleteChild}
        isDeleting={isDeleting}
      />

      <EditChildNameDialog
        open={editNameOpen}
        onOpenChange={setEditNameOpen}
        child={managedChild}
        onSuccess={() => refreshChildren()}
      />
      
      <EditChildUsernameDialog
        open={editUsernameOpen}
        onOpenChange={setEditUsernameOpen}
        child={managedChild}
        onSuccess={() => refreshChildren()}
      />

      <ChangeChildPasswordDialog
        open={changePasswordOpen}
        onOpenChange={setChangePasswordOpen}
        child={managedChild}
      />

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
