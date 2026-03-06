import { useState, useEffect } from "react";
import { Users, Plus, LayoutDashboard, Search, Filter } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { StudentReportDialog } from "@/components/StudentReportDialog";
import { AssignPracticeDialog } from "@/components/AssignPracticeDialog";
import { ChildOverviewCard } from "@/components/parent/ChildOverviewCard";
import { DummyPaymentModal } from "@/components/parent/DummyPaymentModal";
import { AddChildDialog } from "@/components/parent/AddChildDialog";
import { DeleteChildDialog } from "@/components/parent/DeleteChildDialog";
import { EditChildNameDialog } from "@/components/parent/EditChildNameDialog";
import { ChangeChildPasswordDialog } from "@/components/parent/ChangeChildPasswordDialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LinkedChild, ChildAnalytics } from "@/types/parent";

export default function MyChildren() {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [children, setChildren] = useState<LinkedChild[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [parentUserId, setParentUserId] = useState<string | null>(null);
    const [childrenAnalytics, setChildrenAnalytics] = useState<Map<string, ChildAnalytics>>(new Map());

    const [reportOpen, setReportOpen] = useState(false);
    const [assignOpen, setAssignOpen] = useState(false);
    const [addChildOpen, setAddChildOpen] = useState(false);
    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [editNameOpen, setEditNameOpen] = useState(false);
    const [changePasswordOpen, setChangePasswordOpen] = useState(false);

    const [selectedChild, setSelectedChild] = useState<LinkedChild | null>(null);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        const fetchParentData = async () => {
            if (!user) return;
            try {
                const { data: parentData } = await supabase
                    .from("parents")
                    .select("id")
                    .eq("user_id", user.id)
                    .single();

                if (parentData) {
                    setParentUserId(parentData.id);
                    await fetchChildren(parentData.id);
                }
            } catch (error) {
                console.error("Error fetching parent data:", error);
            } finally {
                setIsLoading(false);
            }
        };
        fetchParentData();
    }, [user]);

    const fetchChildren = async (parentId: string) => {
        try {
            const { data, error } = await supabase
                .from("students")
                .select(`
          id,
          user_id,
          class_year,
          is_premium,
          profile:profiles(full_name, unique_id, username)
        `)
                .eq("parent_id", parentId);

            if (error) throw error;
            if (data) {
                setChildren(data as unknown as LinkedChild[]);
                data.forEach((child) => fetchAnalytics(child.id));
            }
        } catch (error) {
            console.error("Error fetching children:", error);
            toast.error("Failed to load students");
        }
    };

    const fetchAnalytics = async (studentId: string) => {
        try {
            const { data: quizResults } = await supabase
                .from("quiz_results")
                .select("*")
                .eq("student_id", studentId)
                .order("completed_at", { ascending: false });

            if (quizResults && quizResults.length > 0) {
                const averageScore = quizResults.reduce((acc, result) => acc + result.score, 0) / quizResults.length;
                const subjectMap = new Map<string, { totalScore: number; count: number }>();
                quizResults.forEach((result) => {
                    const existing = subjectMap.get(result.subject) || { totalScore: 0, count: 0 };
                    subjectMap.set(result.subject, {
                        totalScore: existing.totalScore + result.score,
                        count: existing.count + 1,
                    });
                });

                const subjectPerformance = Array.from(subjectMap.entries()).map(([subject, data]) => ({
                    subject: subject.charAt(0).toUpperCase() + subject.slice(1),
                    avgScore: Math.round(data.totalScore / data.count),
                    count: data.count,
                }));

                const analytics: ChildAnalytics = {
                    studentId,
                    averageScore: Math.round(averageScore),
                    totalQuizzes: quizResults.length,
                    subjectPerformance,
                    recentQuizzes: quizResults.slice(0, 5) as any[],
                };
                setChildrenAnalytics((prev) => new Map(prev).set(studentId, analytics));
            }
        } catch (error) {
            console.error("Error fetching child analytics:", error);
        }
    };

    const handleDeleteChild = async () => {
        if (!selectedChild) return;
        try {
            const { error } = await supabase.functions.invoke("delete-student-account", {
                body: { studentId: selectedChild.id },
            });
            if (error) throw error;
            toast.success(`${selectedChild.profile.full_name}'s account deleted`);
            setDeleteDialogOpen(false);
            if (parentUserId) fetchChildren(parentUserId);
        } catch (error: any) {
            toast.error(error.message || "Failed to delete account");
        }
    };

    const filteredChildren = children.filter(child =>
        child.profile.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        child.profile.username?.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <div className="p-6 space-y-8 animate-fade-in max-w-7xl mx-auto">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2 border-b border-border/40">
                <div className="space-y-1">
                    <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-wider text-xs">
                        <Users className="h-4 w-4" />
                        <span>Student Management</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tight text-foreground">
                        My <span className="text-primary italic">Children</span>.
                    </h1>
                    <p className="text-muted-foreground font-medium max-w-md">
                        Manage your children's accounts, track individual progress, and assign dedicated practice.
                    </p>
                </div>
                <div className="flex gap-3">
                    <Button
                        onClick={() => navigate("/dashboard/parent")}
                        variant="outline"
                        className="rounded-2xl border-2 font-bold h-12 shadow-sm hover:bg-muted"
                    >
                        <LayoutDashboard className="mr-2 h-5 w-5" />
                        Dashboard
                    </Button>
                    <Button
                        onClick={() => setAddChildOpen(true)}
                        variant="hero"
                        className="rounded-2xl font-black h-12 shadow-xl shadow-primary/20 px-6"
                    >
                        <Plus className="mr-2 h-6 w-6" />
                        Add New Child
                    </Button>
                </div>
            </div>

            {/* Metrics Overivew */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-[2rem] border-2 border-primary/10 bg-primary/5 p-6 space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-primary/60">Total Students</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black text-primary">{children.length}</p>
                        <p className="text-sm font-bold text-primary/40">Active</p>
                    </div>
                </Card>
                <Card className="rounded-[2rem] border-2 border-amber-500/10 bg-amber-500/5 p-6 space-y-2">
                    <p className="text-xs font-black uppercase tracking-widest text-amber-600/60">Premium Access</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-4xl font-black text-amber-600">{children.filter(c => c.is_premium).length}</p>
                        <p className="text-sm font-bold text-amber-600/40">Students</p>
                    </div>
                </Card>
            </div>

            {/* Search and Filters */}
            <div className="relative group max-w-md">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <Input
                    placeholder="Search by name or username..."
                    className="pl-12 h-14 rounded-2xl border-2 focus:border-primary/50 text-base font-medium shadow-sm"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* Children Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {[1, 2].map(i => <div key={i} className="h-64 rounded-[2.5rem] bg-muted animate-pulse border-2 border-border/50" />)}
                </div>
            ) : filteredChildren.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
                    {filteredChildren.map((child, index) => (
                        <ChildOverviewCard
                            key={child.id}
                            child={child}
                            index={index}
                            analytics={childrenAnalytics.get(child.id)}
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
                            onChangePassword={(c) => {
                                setSelectedChild(c);
                                setChangePasswordOpen(true);
                            }}
                        />
                    ))}
                </div>
            ) : (
                <Card className="rounded-[2.5rem] border-3 border-dashed border-border/60 bg-muted/20 p-20 flex flex-col items-center justify-center text-center space-y-6">
                    <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center mb-2">
                        <Users className="h-12 w-12 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-2">
                        <h2 className="text-2xl font-black tracking-tight">No students found</h2>
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
                studentName={selectedChild?.profile.full_name || ""}
                studentClass={selectedChild?.class_year === "year_6" ? "Year 6" : "Year 9"}
                avatar={selectedChild?.profile.full_name?.charAt(0)}
            />

            <AssignPracticeDialog
                open={assignOpen}
                onOpenChange={setAssignOpen}
                childName={selectedChild?.profile.full_name}
            />

            <AddChildDialog
                open={addChildOpen}
                onOpenChange={setAddChildOpen}
                parentId={parentUserId}
                onSuccess={() => parentUserId && fetchChildren(parentUserId)}
            />

            <DummyPaymentModal
                open={paymentModalOpen}
                onOpenChange={setPaymentModalOpen}
                studentId={selectedChild?.id || ""}
                studentName={selectedChild?.profile.full_name || ""}
                onSuccess={() => parentUserId && fetchChildren(parentUserId)}
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
                onSuccess={() => parentUserId && fetchChildren(parentUserId)}
            />

            <ChangeChildPasswordDialog
                open={changePasswordOpen}
                onOpenChange={setChangePasswordOpen}
                child={selectedChild}
            />
        </div>
    );
}
