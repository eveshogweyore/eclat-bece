import { useState } from "react";
import { Users, Plus, LayoutDashboard, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { AssignPracticeDialog } from "@/components/AssignPracticeDialog";
import { ChildOverviewCard } from "@/components/parent/ChildOverviewCard";
import { DummyPaymentModal } from "@/components/parent/DummyPaymentModal";
import { AddChildDialog } from "@/components/parent/AddChildDialog";
import { DeleteChildDialog } from "@/components/parent/DeleteChildDialog";
import { EditChildNameDialog } from "@/components/parent/EditChildNameDialog";
import { EditChildUsernameDialog } from "@/components/parent/EditChildUsernameDialog";
import { ChangeChildPasswordDialog } from "@/components/parent/ChangeChildPasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useParentAccount } from "@/hooks/useParentAccount";
import { useChildrenData } from "@/hooks/useChildrenData";
import { LinkedChild, Assignment } from "@/types/parent";
import { getEdgeFunctionError } from "@/lib/errorUtils";
import { QuestionSnapshotDialog } from "@/components/quiz/QuestionSnapshotDialog";
import { PortalDataState } from "@/components/PortalDataState";

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

export default function MyChildren() {
    const navigate = useNavigate();
    const { parentId, loading: parentAccountLoading } = useParentAccount();

    const {
        children,
        childrenAnalytics,
        childrenAssignments,
        isLoading,
        error: childrenError,
        refresh: refreshChildren,
    } = useChildrenData(parentId);

    const [reportOpen, setReportOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [addChildOpen, setAddChildOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editNameOpen, setEditNameOpen] = useState(false);
    const [editUsernameOpen, setEditUsernameOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);

    // Review Assignment Snapshot State
    const [reviewModalOpen, setReviewModalOpen] = useState(false);
    const [reviewSnapshot, setReviewSnapshot] = useState<{
        questions: any[];
        userResponses: (number | null)[];
        answers: boolean[];
        subjectName: string;
        childName: string;
    } | null>(null);

    const handleReviewAssignment = async (assignment: Assignment, childName: string) => {
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
                userResponses: fallbackQuestions.map((q) => (assignment.score && assignment.score >= 50 ? q.correctAnswer : null)),
                answers: fallbackQuestions.map(() => true),
                subjectName: assignment.subject,
                childName,
            });
            setReviewModalOpen(true);
        } catch (err) {
            console.error("Error loading assignment review:", err);
            toast.error("Could not load question snapshot.");
        }
    };

    const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    const handleDeleteChild = async () => {
        if (!selectedChild) return;
        try {
            const { data, error } = await supabase.functions.invoke("delete-student-account", {
                body: { studentId: selectedChild.id },
            });
            if (error) {
                const message = await getEdgeFunctionError(error, "Failed to delete account");
                throw new Error(message);
            }
            if (data?.error) throw new Error(data.error);
            toast.success(`${selectedChild.profile.full_name}'s account deleted`);
            setDeleteDialogOpen(false);
            refreshChildren();
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : "Failed to delete account");
        }
    };

    const filteredChildren = children.filter(child =>
        child.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        child.profile.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Failures must not masquerade as an empty family.
    if (isLoading) {
        return <PortalDataState loading />;
    }
    if (childrenError) {
        return <PortalDataState error={childrenError} onRetry={refreshChildren} />;
    }

    return (
        <div className="w-full space-y-6 sm:space-y-8 animate-fade-in">
            {/* Header Section */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                        <Users className="h-3.5 w-3.5" />
                        <span>Learner Management</span>
                    </div>
                    <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                        My Children<span className="text-primary">.</span>
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                        Manage student profiles, view comprehensive exam stats, and assign practice.
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3">
                    <Button
                        onClick={() => navigate("/dashboard/parent")}
                        variant="outline"
                        className="text-xs sm:text-sm"
                    >
                        <LayoutDashboard className="mr-1.5 h-4 w-4" />
                        Dashboard
                    </Button>
                    <Button
                        onClick={() => setAddChildOpen(true)}
                        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs sm:text-sm shadow-sm"
                    >
                        <Plus className="mr-1.5 h-4 w-4" />
                        Add New Child
                    </Button>
                </div>
            </div>

            {/* Metrics Overview */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                <Card className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Enrolled Children</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-2xl sm:text-3xl font-black text-foreground">{children.length}</p>
                        <p className="text-xs text-primary font-medium">Active</p>
                    </div>
                </Card>
                <Card className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-5">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Premium Access</p>
                    <div className="flex items-baseline gap-2 mt-1">
                        <p className="text-2xl sm:text-3xl font-black text-amber-500">{children.filter(c => c.is_premium).length}</p>
                        <p className="text-xs text-amber-500/80 font-medium">VIP</p>
                    </div>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="relative max-w-md">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="Search by name or username..."
                    className="pl-10 h-10 rounded-xl border border-border bg-background text-xs sm:text-sm text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Children Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                    {[1, 2].map(i => <div key={i} className="h-64 rounded-2xl bg-card animate-pulse border border-border" />)}
                </div>
            ) : filteredChildren.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    {filteredChildren.map((child, index) => (
                        <ChildOverviewCard
                            key={child.id}
                            child={child}
                            index={index}
                            analytics={childrenAnalytics.get(child.id)}
                            assignments={childrenAssignments.get(child.id) || []}
                            onViewReport={(c) => {
                                setSelectedChild(c);
                                setReportOpen(true);
                            }}
                            onAssignPractice={(c) => {
                                setSelectedChild(c);
                                setAssignOpen(true);
                            }}
                            onUpgradePremium={(c) => {
                                setSelectedChild(c);
                                setPaymentModalOpen(true);
                            }}
                            onDeleteChild={(c) => {
                                setSelectedChild(c);
                                setDeleteDialogOpen(true);
                            }}
                            onEditName={(c) => {
                                setSelectedChild(c);
                                setEditNameOpen(true);
                            }}
                            onEditUsername={(c) => {
                                setSelectedChild(c);
                                setEditUsernameOpen(true);
                            }}
                            onChangePassword={(c) => {
                                setSelectedChild(c);
                                setChangePasswordOpen(true);
                            }}
                            onReviewAssignment={handleReviewAssignment}
                        />
                    ))}
                </div>
            ) : (
                <Card className="rounded-[2.5rem] border-3 border-dashed border-border/60 bg-muted/20 p-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-2">
                        <Users className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight text-[#71c9ed]">No students found</h2>
                        <p className="text-muted-foreground font-medium max-w-xs mx-auto text-lg leading-relaxed">
                            {searchQuery ? "Try a different search term or clear the filter." : "Start by adding your first child to track their progress."}
                        </p>
                    </div>
                    {!searchQuery && (
                        <Button onClick={() => setAddChildOpen(true)} variant="hero" className="rounded-2xl h-14 px-8 font-black text-lg shadow-xl shadow-primary/20">
                            <Plus className="mr-2 h-6 w-6" />
                            Add First Child
                        </Button>
                    )}
                </Card>
            )}

            {/* Dialogs */}
            <StudentReportDialog
                open={reportOpen}
                onOpenChange={setReportOpen}
                studentId={selectedChild?.id || ""}
                studentName={selectedChild?.profile.full_name || ""}
                studentClass={selectedChild?.class_year === "year_6" ? "Year 6" : "Year 9"}
                avatar={selectedChild?.profile.full_name?.charAt(0)}
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
                studentId={selectedChild?.id || ""}
                studentName={selectedChild?.profile.full_name || ""}
                onSuccess={() => refreshChildren()}
            />

            <DeleteChildDialog
                isOpen={deleteDialogOpen}
                onOpenChange={setDeleteDialogOpen}
                child={selectedChild}
                onConfirm={handleDeleteChild}
                isDeleting={false}
            />

            <EditChildNameDialog
                open={editNameOpen}
                onOpenChange={setEditNameOpen}
                child={selectedChild}
                onSuccess={() => refreshChildren()}
            />

            <EditChildUsernameDialog
                open={editUsernameOpen}
                onOpenChange={setEditUsernameOpen}
                child={selectedChild ? { id: selectedChild.id, profile: { username: selectedChild.profile.username } } : null}
                onSuccess={() => refreshChildren()}
            />

            <ChangeChildPasswordDialog
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
                child={selectedChild}
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
