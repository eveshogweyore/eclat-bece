import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionError } from "@/lib/errorUtils";
import { Eye, EyeOff, UserPlus, Link2, Search, Loader2, CheckCircle2, UserCheck } from "lucide-react";

interface AddChildDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parentId: string | null;
    onSuccess: () => void;
}

interface FoundStudent {
    id: string;
    user_id: string;
    class_year: string | null;
    parent_id: string | null;
    profile: {
        full_name: string | null;
        unique_id: string;
        username: string | null;
    };
}

export function AddChildDialog({ open, onOpenChange, parentId, onSuccess }: AddChildDialogProps) {
    const [activeTab, setActiveTab] = useState<"create" | "link">("create");

    // Create New Child states
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [newChildData, setNewChildData] = useState({
        fullName: "",
        classYear: "",
        username: "",
        password: "",
    });
    const [createdChildCredentials, setCreatedChildCredentials] = useState<{ username: string; password: string } | null>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Link Existing Student states
    const [studentSearchCode, setStudentSearchCode] = useState("");
    const [isSearchingStudent, setIsSearchingStudent] = useState(false);
    const [foundStudent, setFoundStudent] = useState<FoundStudent | null>(null);
    const [isSendingLinkRequest, setIsSendingLinkRequest] = useState(false);
    const [linkRequestSent, setLinkRequestSent] = useState(false);

    const handleCreateChild = async () => {
        if (!newChildData.fullName || !newChildData.classYear || !newChildData.username || !newChildData.password) {
            toast.error("Please fill in all fields");
            return;
        }

        if (newChildData.username.length < 2 || newChildData.username.length > 20) {
            toast.error("Username must be between 2 and 20 characters");
            return;
        }

        // Mirror the server's rule exactly so parents aren't surprised late
        // (create-student-account enforces /^[a-z0-9._-]{2,20}$/).
        if (!/^[a-z0-9._-]+$/.test(newChildData.username)) {
            toast.error("Username may only contain lowercase letters, numbers, dots, underscores, or hyphens");
            return;
        }

        if (newChildData.password.length < 6) {
            toast.error("Password must be at least 6 characters");
            return;
        }

        if (!parentId) {
            toast.error("Parent profile not found");
            return;
        }

        setIsAddingChild(true);

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.access_token) throw new Error("No session found");

            const { data, error } = await supabase.functions.invoke("create-student-account", {
                body: newChildData,
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (error) {
                const message = await getEdgeFunctionError(error, "Failed to create student account");
                throw new Error(message);
            }

            if (data?.error) throw new Error(data.error);

            toast.success("Student account created successfully!");
            setCreatedChildCredentials({ username: newChildData.username.trim().toLowerCase(), password: newChildData.password });
            onSuccess();
        } catch (error: unknown) {
            console.error("Error creating student account:", error);
            toast.error(error instanceof Error ? error.message : "Failed to create student account");
        } finally {
            setIsAddingChild(false);
        }
    };

    const handleSearchStudent = async () => {
        const query = studentSearchCode.trim();
        if (!query) {
            toast.error("Please enter a student ID or username");
            return;
        }

        setIsSearchingStudent(true);
        setFoundStudent(null);
        setLinkRequestSent(false);

        try {
            // Resolve the student through a scoped SECURITY DEFINER RPC —
            // profiles are no longer readable across accounts.
            const { data: match, error: lookupError } = await supabase
                .rpc("lookup_student_by_code", { p_query: query })
                .maybeSingle();

            if (lookupError) throw lookupError;

            if (!match) {
                toast.error("No student found with that ID or username.");
                return;
            }

            setFoundStudent({
                id: match.student_id,
                user_id: match.user_id,
                class_year: match.class_year,
                parent_id: match.parent_id,
                profile: {
                    full_name: match.full_name,
                    unique_id: match.unique_id,
                    username: match.username,
                },
            });
        } catch (err: unknown) {
            console.error("Error searching student:", err);
            toast.error("Error searching for student");
        } finally {
            setIsSearchingStudent(false);
        }
    };

    const handleSendLinkRequest = async () => {
        if (!foundStudent || !parentId) return;

        if (foundStudent.parent_id === parentId) {
            toast.info("This child is already connected to your account!");
            return;
        }

        if (foundStudent.parent_id) {
            toast.error("This student is already linked to another parent account.");
            return;
        }

        setIsSendingLinkRequest(true);
        try {
            // Check for existing pending request
            const { data: existingReq } = await supabase
                .from("parent_child_link_requests")
                .select("id, status")
                .eq("parent_id", parentId)
                .eq("student_id", foundStudent.id)
                .maybeSingle();

            let requestId = existingReq?.id;
            let requestIsNew = false;

            if (!existingReq || existingReq.status === "rejected") {
                const { data: newReq, error: insertError } = await supabase
                    .from("parent_child_link_requests")
                    .insert({
                        parent_id: parentId,
                        student_id: foundStudent.id,
                        status: "pending",
                    })
                    .select("id")
                    .single();

                if (insertError) throw insertError;
                requestId = newReq.id;
                requestIsNew = true;
            }

            // Only notify the student when a request was actually (re)created —
            // re-tapping on an existing pending request must not spam their inbox.
            if (requestIsNew) {
                // Get current parent's display name
                const { data: { user } } = await supabase.auth.getUser();
                const { data: parentProfile } = await supabase
                    .from("profiles")
                    .select("full_name")
                    .eq("id", user?.id || "")
                    .maybeSingle();

                await supabase.from("notifications").insert({
                    user_id: foundStudent.user_id,
                    type: "link_request",
                    title: "Parent Link Request",
                    message: `${parentProfile?.full_name || "A parent"} requested to link to your account.`,
                    read: false,
                    metadata: {
                        request_id: requestId,
                        parent_id: parentId,
                        parent_name: parentProfile?.full_name || "Parent",
                    },
                });
            }

            toast.success(`Link request sent to ${foundStudent.profile.full_name || "student"}!`);
            setLinkRequestSent(true);
        } catch (err) {
            console.error("Error sending link request:", err);
            toast.error("Failed to send link request");
        } finally {
            setIsSendingLinkRequest(false);
        }
    };

    const handleClose = () => {
        setNewChildData({
            fullName: "",
            classYear: "",
            username: "",
            password: "",
        });
        setCreatedChildCredentials(null);
        setShowPassword(false);
        setStudentSearchCode("");
        setFoundStudent(null);
        setLinkRequestSent(false);
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[460px] rounded-3xl">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-black">
                        {createdChildCredentials ? "Student Account Created" : "Add Child"}
                    </DialogTitle>
                    <DialogDescription>
                        {createdChildCredentials
                            ? "Please save these login credentials. Your child will need them to log in."
                            : "Create a new child account or link to an existing student profile."}
                    </DialogDescription>
                </DialogHeader>

                <div className="pt-2">
                    {createdChildCredentials ? (
                        <div className="space-y-4 p-5 bg-muted/40 rounded-2xl border border-border">
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Username</Label>
                                <p className="font-mono text-lg font-bold text-foreground">{createdChildCredentials.username}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs uppercase font-bold tracking-wider">Temporary Password</Label>
                                <p className="font-mono text-lg font-bold text-foreground">{createdChildCredentials.password}</p>
                            </div>
                            <Button
                                className="w-full mt-4 rounded-xl font-bold"
                                variant="hero"
                                onClick={handleClose}
                            >
                                Done
                            </Button>
                        </div>
                    ) : (
                        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "create" | "link")} className="w-full">
                            <TabsList className="grid w-full grid-cols-2 rounded-xl mb-4">
                                <TabsTrigger value="create" className="rounded-lg font-bold text-xs">
                                    <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                                    Create New
                                </TabsTrigger>
                                <TabsTrigger value="link" className="rounded-lg font-bold text-xs">
                                    <Link2 className="mr-1.5 h-3.5 w-3.5" />
                                    Link Existing
                                </TabsTrigger>
                            </TabsList>

                            {/* Tab 1: Create Account */}
                            <TabsContent value="create" className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="fullName" className="text-sm font-bold">Full Name</Label>
                                    <Input
                                        id="fullName"
                                        placeholder="e.g. Ada Okafor"
                                        value={newChildData.fullName}
                                        onChange={(e) => setNewChildData({ ...newChildData, fullName: e.target.value })}
                                        className="rounded-xl border-2 focus:border-primary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="classYear" className="text-sm font-bold">Class Year</Label>
                                    <select
                                        id="classYear"
                                        className="flex h-10 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50 font-medium"
                                        value={newChildData.classYear}
                                        onChange={(e) => setNewChildData({ ...newChildData, classYear: e.target.value })}
                                    >
                                        <option value="" disabled>Select Class Year</option>
                                        <option value="year_6">Year 6 (Primary 6 - Common Entrance)</option>
                                        <option value="year_9">Year 9 (JSS 3 - BECE)</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="username" className="text-sm font-bold">Student Username</Label>
                                    <Input
                                        id="username"
                                        placeholder="e.g. ada.okafor"
                                        value={newChildData.username}
                                        onChange={(e) => setNewChildData({ ...newChildData, username: e.target.value })}
                                        className="rounded-xl border-2 focus:border-primary/50"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="password" className="text-sm font-bold">Student Password</Label>
                                    <div className="relative">
                                        <Input
                                            id="password"
                                            type={showPassword ? "text" : "password"}
                                            placeholder="Minimum 6 characters"
                                            value={newChildData.password}
                                            onChange={(e) => setNewChildData({ ...newChildData, password: e.target.value })}
                                            className="rounded-xl border-2 focus:border-primary/50 pr-10"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                        >
                                            {showPassword ? (
                                                <EyeOff className="h-4 w-4" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleClose}
                                        className="flex-1 rounded-xl font-bold border-2 h-12"
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="hero"
                                        onClick={handleCreateChild}
                                        disabled={isAddingChild || !newChildData.fullName || !newChildData.classYear || !newChildData.username || !newChildData.password.trim()}
                                        className="flex-1 rounded-xl font-black h-12 shadow-lg shadow-primary/20"
                                    >
                                        {isAddingChild ? "Creating..." : "Create Account"}
                                    </Button>
                                </div>
                            </TabsContent>

                            {/* Tab 2: Link Existing Student */}
                            <TabsContent value="link" className="space-y-4">
                                <div className="space-y-2">
                                    <Label className="text-sm font-bold">Student Unique Code or Username</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="e.g. STU-12345 or username"
                                            value={studentSearchCode}
                                            onChange={(e) => setStudentSearchCode(e.target.value)}
                                            onKeyDown={(e) => e.key === "Enter" && handleSearchStudent()}
                                            className="rounded-xl border-2 focus:border-primary/50 font-mono"
                                        />
                                        <Button
                                            onClick={handleSearchStudent}
                                            disabled={isSearchingStudent || !studentSearchCode.trim()}
                                            className="rounded-xl font-bold px-4"
                                        >
                                            {isSearchingStudent ? (
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Search className="h-4 w-4" />
                                            )}
                                        </Button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">
                                        Ask your child for their Student ID or username from their student dashboard settings.
                                    </p>
                                </div>

                                {foundStudent && (
                                    <div className="rounded-2xl border border-border/80 bg-muted/30 p-4 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-black text-foreground text-base">
                                                    {foundStudent.profile.full_name || "Student"}
                                                </p>
                                                <p className="text-xs text-muted-foreground font-mono">
                                                    @{foundStudent.profile.username || foundStudent.profile.unique_id}
                                                </p>
                                            </div>
                                            <Badge variant="outline" className="font-bold text-xs uppercase">
                                                {foundStudent.class_year === "year_6" ? "Year 6" : foundStudent.class_year === "year_9" ? "Year 9" : "Student"}
                                            </Badge>
                                        </div>

                                        {foundStudent.parent_id === parentId ? (
                                            <div className="flex items-center gap-2 text-emerald-500 text-xs font-bold pt-1">
                                                <CheckCircle2 className="h-4 w-4" />
                                                Already linked to your parent account.
                                            </div>
                                        ) : foundStudent.parent_id ? (
                                            <p className="text-xs text-rose-500 font-bold">
                                                This student is already linked to another parent account.
                                            </p>
                                        ) : linkRequestSent ? (
                                            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 text-emerald-500 text-xs font-bold text-center">
                                                ✓ Link request sent! The student will see an accept prompt in their notification bell.
                                            </div>
                                        ) : (
                                            <Button
                                                onClick={handleSendLinkRequest}
                                                disabled={isSendingLinkRequest}
                                                className="w-full rounded-xl bg-primary text-primary-foreground font-black text-sm h-11"
                                            >
                                                {isSendingLinkRequest ? (
                                                    <>
                                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        Sending Request...
                                                    </>
                                                ) : (
                                                    "Send Link Request"
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                )}

                                <div className="flex justify-end pt-2">
                                    <Button variant="ghost" onClick={handleClose} className="rounded-xl font-bold">
                                        Close
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
