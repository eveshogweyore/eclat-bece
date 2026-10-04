import { useState, useEffect, useCallback } from "react";
import { CreditCard, LayoutDashboard, Zap, CheckCircle2, Clock, Calendar } from "lucide-react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useParentAccount } from "@/hooks/useParentAccount";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { DummyPaymentModal } from "@/components/parent/DummyPaymentModal";
import { format } from "date-fns";

interface LinkedChild {
    id: string;
    user_id: string;
    class_year: string;
    is_premium: boolean;
    profile: {
        full_name: string | null;
        unique_id: string;
        username: string | null;
    };
}

interface Subscription {
    id: string;
    student_id: string;
    plan: string;
    status: string;
    amount: number;
    currency: string;
    started_at: string;
    expires_at: string | null;
}

const STANDARD_FEATURES = [
    "Access to core question bank",
    "50 questions per practice session",
    "Basic subject coverage",
    "Parent progress overview",
];

const PREMIUM_FEATURES = [
    "Unlimited practice questions",
    "Full analytics & performance reports",
    "All subjects including comprehension",
    "Detailed topic-level breakdown",
    "Priority support badge",
    "Leaderboard access",
];

export default function SubscriptionsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const { parentId, loading: parentLoading } = useParentAccount();

    const [children, setChildren] = useState<LinkedChild[]>([]);
    const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const [paymentModalOpen, setPaymentModalOpen] = useState(false);
    const [selectedChild, setSelectedChild] = useState<{ id: string; name: string } | null>(null);

    const fetchSubscriptionsData = useCallback(async () => {
        if (!parentId) {
            if (!parentLoading) {
                setIsLoading(false);
            }
            return;
        }
        try {
            setIsLoading(true);
            const [childrenResult, subsResult] = await Promise.all([
                supabase
                    .from("students")
                    .select("id, user_id, class_year, is_premium, profile:profiles(full_name, unique_id, username)")
                    .eq("parent_id", parentId),
                supabase
                    .from("subscriptions")
                    .select("*")
                    .eq("parent_id", parentId)
                    .eq("status", "active"),
            ]);

            if (childrenResult.data) setChildren(childrenResult.data as unknown as LinkedChild[]);
            if (subsResult.data) setSubscriptions(subsResult.data as Subscription[]);
        } catch (err) {
            console.error("Error loading subscriptions:", err);
            toast.error("Failed to load subscription data");
        } finally {
            setIsLoading(false);
        }
    }, [parentId, parentLoading]);

    useEffect(() => {
        fetchSubscriptionsData();
    }, [fetchSubscriptionsData]);

    const refetch = async () => {
        if (!parentId) return;
        const [childrenResult, subsResult] = await Promise.all([
            supabase
                .from("students")
                .select("id, user_id, class_year, is_premium, profile:profiles(full_name, unique_id, username)")
                .eq("parent_id", parentId),
            supabase
                .from("subscriptions")
                .select("*")
                .eq("parent_id", parentId)
                .eq("status", "active"),
        ]);
        if (childrenResult.data) setChildren(childrenResult.data as unknown as LinkedChild[]);
        if (subsResult.data) setSubscriptions(subsResult.data as Subscription[]);
    };

    const getSubscription = (studentId: string) =>
        subscriptions.find((s) => s.student_id === studentId);

    const classLabel = (cy: string) =>
        cy === "year_6" ? "Year 6" : cy === "year_9" ? "Year 9" : cy;

    const premiumCount = children.filter((c) => c.is_premium).length;

    return (
        <div className="w-full space-y-6 sm:space-y-8 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-[11px] font-semibold text-primary">
                        <CreditCard className="h-3.5 w-3.5" />
                        <span>Billing &amp; Access</span>
                    </div>
                    <h1 className="mt-2 text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground">
                        My Subscriptions<span className="text-primary">.</span>
                    </h1>
                    <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                        Manage premium access for your children and view subscription dates.
                    </p>
                </div>
                <Button
                    onClick={() => navigate("/dashboard/parent")}
                    variant="outline"
                    className="text-xs sm:text-sm"
                >
                    <LayoutDashboard className="mr-1.5 h-4 w-4" />
                    Dashboard
                </Button>
            </div>

            {/* Summary Metric */}
            {!isLoading && children.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                    <Card className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Total Children</p>
                        <p className="mt-1 text-2xl sm:text-3xl font-black text-foreground">{children.length}</p>
                        <p className="text-xs text-primary font-medium mt-0.5">Enrolled</p>
                    </Card>
                    <Card className="rounded-2xl border border-amber-500/30 bg-amber-500/5 text-card-foreground shadow-sm p-4 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-500 font-bold">Premium</p>
                        <p className="mt-1 text-2xl sm:text-3xl font-black text-amber-500">{premiumCount}</p>
                        <p className="text-xs text-amber-500/80 font-medium mt-0.5">Full Access</p>
                    </Card>
                    <Card className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-4 sm:p-5">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Standard</p>
                        <p className="mt-1 text-2xl sm:text-3xl font-black text-foreground">{children.length - premiumCount}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">Core Practice</p>
                    </Card>
                </div>
            )}

            {/* Plan Comparison */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-1 bg-primary rounded-full" />
                    <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Available Plans</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                    {/* Standard */}
                    <Card className="rounded-2xl border border-border bg-card text-card-foreground shadow-sm p-5 sm:p-6 flex flex-col justify-between">
                        <div>
                            <span className="rounded-full bg-muted text-muted-foreground border border-border px-2.5 py-0.5 text-[10px] font-bold uppercase">
                                Standard Plan
                            </span>
                            <div className="mt-3">
                                <p className="text-2xl sm:text-3xl font-black text-foreground">Free</p>
                                <p className="text-xs text-muted-foreground mt-0.5">Default account level for all learners</p>
                            </div>
                            <ul className="space-y-2.5 mt-5">
                                {STANDARD_FEATURES.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Card>

                    {/* Premium */}
                    <Card className="rounded-2xl border border-amber-500/40 bg-gradient-to-br from-amber-500/10 via-card to-card text-card-foreground p-5 sm:p-6 flex flex-col justify-between relative overflow-hidden shadow-md">
                        <div>
                            <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2.5 py-0.5 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                <Zap className="h-3 w-3" />
                                Premium VIP
                            </span>
                            <div className="mt-3 flex items-baseline gap-2">
                                <p className="text-2xl sm:text-3xl font-black text-foreground">₦15,000</p>
                                <span className="text-xs text-muted-foreground font-medium">/ year per student</span>
                            </div>
                            <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5 font-medium">All-inclusive BECE &amp; NCEE preparation</p>

                            <ul className="space-y-2.5 mt-5">
                                {PREMIUM_FEATURES.map((f) => (
                                    <li key={f} className="flex items-center gap-2 text-xs text-foreground">
                                        <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </Card>
                </div>
            </div>

            {/* Children Status */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-5 w-1 bg-primary rounded-full" />
                    <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Student Access Details</h2>
                </div>

                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-20 rounded-2xl bg-card animate-pulse border border-border" />
                        ))}
                    </div>
                ) : children.length === 0 ? (
                    <Card className="rounded-2xl border-2 border-dashed border-border bg-card p-12 flex flex-col items-center text-center gap-3">
                        <CreditCard className="h-10 w-10 text-muted-foreground" />
                        <div>
                            <p className="text-base font-bold text-foreground">No children added yet</p>
                            <p className="text-muted-foreground text-xs mt-0.5">Add a child profile first to manage their subscription.</p>
                        </div>
                        <Button
                            onClick={() => navigate("/dashboard/parent/children")}
                            className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs rounded-xl mt-2 shadow-sm"
                        >
                            Go to My Children
                        </Button>
                    </Card>
                ) : (
                    <div className="space-y-3">
                        {children.map((child) => {
                            const initials = child.profile.full_name?.charAt(0).toUpperCase() || "?";
                            const sub = getSubscription(child.id);
                            return (
                                <Card
                                    key={child.id}
                                    className={`rounded-2xl border transition-all duration-200 shadow-sm ${child.is_premium
                                        ? "border-amber-500/30 bg-card hover:border-amber-500/50"
                                        : "border-border bg-card hover:border-primary/40"
                                        }`}
                                >
                                    <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                        <div className="flex items-center gap-3.5 min-w-0">
                                            <div className={`h-12 w-12 rounded-xl flex items-center justify-center text-lg font-black shrink-0 ${child.is_premium ? "bg-gradient-to-br from-amber-400 to-amber-600 text-slate-900" : "bg-primary/10 text-primary"}`}>
                                                {initials}
                                            </div>

                                            <div className="min-w-0 space-y-1">
                                                <p className="text-base font-bold text-foreground truncate">{child.profile.full_name || "Unknown"}</p>
                                                <div className="flex items-center flex-wrap gap-2 text-xs">
                                                    {child.is_premium ? (
                                                        <span className="rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/30 px-2 py-0.5 text-[10px] font-bold uppercase inline-flex items-center gap-1">
                                                            <Zap className="h-3 w-3" /> Premium
                                                        </span>
                                                    ) : (
                                                        <span className="rounded-full bg-muted text-muted-foreground border border-border px-2 py-0.5 text-[10px] font-bold uppercase">
                                                            Standard
                                                        </span>
                                                    )}
                                                    <span className="text-[10px] font-bold text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full uppercase">
                                                        {classLabel(child.class_year)}
                                                    </span>
                                                    {sub?.expires_at && (
                                                        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                                                            <Calendar className="h-3 w-3 text-primary" />
                                                            Expires {format(new Date(sub.expires_at), "dd MMM yyyy")}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>

                                        <div>
                                            {!child.is_premium ? (
                                                <Button
                                                    className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90 font-semibold text-xs rounded-xl h-9 px-4 shadow-sm"
                                                    onClick={() => {
                                                        setSelectedChild({ id: child.id, name: child.profile.full_name || "Child" });
                                                        setPaymentModalOpen(true);
                                                    }}
                                                >
                                                    <Zap className="mr-1.5 h-3.5 w-3.5" />
                                                    Upgrade to Premium
                                                </Button>
                                            ) : (
                                                <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-bold text-xs bg-amber-500/10 border border-amber-500/30 rounded-xl px-3 py-1.5">
                                                    <CheckCircle2 className="h-4 w-4" />
                                                    Active Premium Access
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>

            <DummyPaymentModal
                open={paymentModalOpen}
                onOpenChange={setPaymentModalOpen}
                studentId={selectedChild?.id || ""}
                studentName={selectedChild?.name || ""}
                onSuccess={refetch}
            />
        </div>
    );
}
