import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit, CheckCircle, Eye, AlertTriangle, ShieldAlert, Loader2, ArrowLeft, RefreshCw, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { EditQuestionDialog } from "@/components/admin/EditQuestionDialog";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

interface FlaggedQuestion {
    id: string;
    student_id: string;
    class_year: string;
    question_id: string;
    subject: string;
    topic: string | null;
    question_text: string;
    reason: string;
    details: string | null;
    status: string;
    created_at: string;
    student?: {
        profile?: {
            full_name: string;
            email: string;
        } | null;
    } | null;
}

export default function FlagReportsPage() {
    const navigate = useNavigate();
    const { user } = useAuth();
    const [flags, setFlags] = useState<FlaggedQuestion[]>([]);
    const [loading, setLoading] = useState(true);
    const [statusFilter, setStatusFilter] = useState<string>("pending");
    const [classYearFilter, setClassYearFilter] = useState<string>("all");
    const [reasonFilter, setReasonFilter] = useState<string>("all");
    const [selectedQuestion, setSelectedQuestion] = useState<{ id: string; classYear: "year_6" | "year_9" } | null>(null);

    const fetchFlags = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from("flagged_questions")
                .select(`
                    *,
                    student:students(
                        profile:profiles(
                            full_name,
                            email
                        )
                    )
                `);

            if (statusFilter !== "all") {
                query = query.eq("status", statusFilter);
            }
            if (classYearFilter !== "all") {
                query = query.eq("class_year", classYearFilter);
            }
            if (reasonFilter !== "all") {
                query = query.eq("reason", reasonFilter);
            }

            const { data, error } = await query.order("created_at", { ascending: false });
            if (error) throw error;
            setFlags(data as any[] || []);
        } catch (error: any) {
            console.error("Error fetching flags:", error);
            toast.error(error.message || "Failed to load flagged questions");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFlags();
    }, [statusFilter, classYearFilter, reasonFilter]);

    const handleResolve = async (flagId: string, actionType: "resolved" | "dismissed") => {
        if (!user) return;
        try {
            const { error } = await supabase
                .from("flagged_questions")
                .update({
                    status: actionType,
                    resolved_at: new Date().toISOString(),
                    resolved_by: user.id
                })
                .eq("id", flagId);

            if (error) throw error;

            toast.success(`Report marked as ${actionType}`);
            fetchFlags();
        } catch (error: any) {
            console.error("Error updating flag status:", error);
            toast.error(error.message || "Failed to update report status");
        }
    };

    const getReasonLabel = (reason: string) => {
        switch (reason) {
            case "incorrect_answer":
                return "Incorrect Answer";
            case "typo":
                return "Typo/Formatting";
            case "missing_image":
                return "Missing Image";
            case "incomplete":
                return "Incomplete";
            case "other":
                return "Other";
            default:
                return reason;
        }
    };

    const getReasonColor = (reason: string) => {
        switch (reason) {
            case "incorrect_answer":
                return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
            case "typo":
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "missing_image":
                return "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400";
            case "incomplete":
                return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
            default:
                return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case "pending":
                return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400 border-yellow-200";
            case "resolved":
                return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border-green-200";
            case "dismissed":
                return "bg-slate-100 text-slate-600 dark:bg-slate-850 dark:text-slate-400 border-slate-200";
            default:
                return "bg-slate-100 text-slate-700";
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" onClick={() => navigate("/admin")}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight">Question Flag Reports</h1>
                        <p className="text-muted-foreground">
                            Review and resolve errors reported by students on quiz questions
                        </p>
                    </div>
                </div>
                <Button variant="outline" size="sm" onClick={fetchFlags} className="gap-2">
                    <RefreshCw className="h-4 w-4" />
                    Refresh
                </Button>
            </div>

            {/* Filters */}
            <Card>
                <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
                    <div className="flex flex-wrap gap-4 items-center">
                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Status:</span>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Reports</SelectItem>
                                    <SelectItem value="pending">Pending</SelectItem>
                                    <SelectItem value="resolved">Resolved</SelectItem>
                                    <SelectItem value="dismissed">Dismissed</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Class Year:</span>
                            <Select value={classYearFilter} onValueChange={setClassYearFilter}>
                                <SelectTrigger className="w-[140px]">
                                    <SelectValue placeholder="Class Year" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Years</SelectItem>
                                    <SelectItem value="year_6">Year 6</SelectItem>
                                    <SelectItem value="year_9">Year 9</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-muted-foreground">Reason:</span>
                            <Select value={reasonFilter} onValueChange={setReasonFilter}>
                                <SelectTrigger className="w-[160px]">
                                    <SelectValue placeholder="Reason" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Reasons</SelectItem>
                                    <SelectItem value="incorrect_answer">Incorrect Answer</SelectItem>
                                    <SelectItem value="typo">Typo/Formatting</SelectItem>
                                    <SelectItem value="missing_image">Missing Image</SelectItem>
                                    <SelectItem value="incomplete">Incomplete</SelectItem>
                                    <SelectItem value="other">Other</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* List */}
            <Card>
                <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-destructive" />
                        Report History
                    </CardTitle>
                    <CardDescription>
                        Showing {flags.length} flag reports matching your filters
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="py-20 flex justify-center items-center">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : flags.length === 0 ? (
                        <div className="py-20 text-center text-muted-foreground space-y-2">
                            <CheckCircle className="h-10 w-10 text-muted-foreground/30 mx-auto" />
                            <p className="font-semibold text-lg">All clear!</p>
                            <p className="text-sm">No unresolved flag reports found.</p>
                        </div>
                    ) : (
                        <div className="border rounded-lg overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Reported</TableHead>
                                        <TableHead>Class</TableHead>
                                        <TableHead>Question Text</TableHead>
                                        <TableHead>Student</TableHead>
                                        <TableHead>Reason</TableHead>
                                        <TableHead>Details</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {flags.map((flag) => (
                                        <TableRow key={flag.id} className="hover:bg-muted/10">
                                            <TableCell className="text-xs whitespace-nowrap">
                                                {formatDistanceToNow(new Date(flag.created_at), { addSuffix: true })}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold uppercase">
                                                {flag.class_year === "year_6" ? "Year 6" : "Year 9"}
                                            </TableCell>
                                            <TableCell className="max-w-[200px]">
                                                <p className="text-sm font-medium line-clamp-2" title={flag.question_text}>
                                                    {flag.question_text}
                                                </p>
                                                <span className="text-[10px] text-muted-foreground uppercase tracking-wide">
                                                    {flag.subject} &bull; {flag.topic || "Mixed"}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <p className="text-sm font-medium">
                                                    {flag.student?.profile?.full_name || "Unknown student"}
                                                </p>
                                                <p className="text-xs text-muted-foreground">
                                                    {flag.student?.profile?.email || ""}
                                                </p>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className={`border-none ${getReasonColor(flag.reason)}`}>
                                                    {getReasonLabel(flag.reason)}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="max-w-[200px] text-sm text-muted-foreground italic">
                                                {flag.details || "-"}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className={getStatusColor(flag.status)}>
                                                    {flag.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8 gap-1.5"
                                                        onClick={() => setSelectedQuestion({
                                                            id: flag.question_id,
                                                            classYear: flag.class_year as "year_6" | "year_9"
                                                        })}
                                                    >
                                                        <Edit className="h-3.5 w-3.5" />
                                                        Edit
                                                    </Button>
                                                    {flag.status === "pending" && (
                                                        <>
                                                            <Button
                                                                variant="default"
                                                                size="sm"
                                                                className="h-8 gap-1 bg-green-600 hover:bg-green-700 text-white"
                                                                onClick={() => handleResolve(flag.id, "resolved")}
                                                            >
                                                                <CheckCircle className="h-3.5 w-3.5" />
                                                                Resolve
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="h-8 gap-1 text-destructive hover:bg-destructive/10"
                                                                onClick={() => handleResolve(flag.id, "dismissed")}
                                                            >
                                                                <XCircle className="h-3.5 w-3.5" />
                                                                Dismiss
                                                            </Button>
                                                        </>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Edit Question Dialog Integration */}
            {selectedQuestion && (
                <EditQuestionDialog
                    open={!!selectedQuestion}
                    onOpenChange={(open) => !open && setSelectedQuestion(null)}
                    questionId={selectedQuestion.id}
                    classYear={selectedQuestion.classYear}
                    onSuccess={() => {
                        fetchFlags();
                        setSelectedQuestion(null);
                    }}
                />
            )}
        </div>
    );
}
