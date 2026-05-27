import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

interface AddChildDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    parentId: string | null;
    onSuccess: () => void;
}

export function AddChildDialog({ open, onOpenChange, parentId, onSuccess }: AddChildDialogProps) {
    const [isAddingChild, setIsAddingChild] = useState(false);
    const [newChildData, setNewChildData] = useState({
        fullName: "",
        classYear: "",
        username: "",
        password: "",
    });
    const [createdChildCredentials, setCreatedChildCredentials] = useState<{ username: string; password: string } | null>(null);

    const handleCreateChild = async () => {
        if (!newChildData.fullName || !newChildData.classYear || !newChildData.username || !newChildData.password) {
            toast.error("Please fill in all fields");
            return;
        }

        if (newChildData.username.length < 2 || newChildData.username.length > 20) {
            toast.error("Username must be between 2 and 20 characters");
            return;
        }

        if (/\s/.test(newChildData.username)) {
            toast.error("Username cannot contain spaces");
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

            const response = await supabase.functions.invoke("create-student-account", {
                body: newChildData,
                headers: {
                    Authorization: `Bearer ${session.access_token}`
                }
            });

            if (response.error) throw response.error;
            if (response.data?.error) throw new Error(response.data.error);

            toast.success("Student account created successfully!");
            setCreatedChildCredentials({ username: newChildData.username.trim().toLowerCase(), password: newChildData.password });
            onSuccess();
        } catch (error: unknown) {
            console.error("Error creating student account:", error);
            toast.error(getErrorMessage(error, "Failed to create student account"));
        } finally {
            setIsAddingChild(false);
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
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{createdChildCredentials ? "Student Account Created" : "Create Student Account"}</DialogTitle>
                    <DialogDescription>
                        {createdChildCredentials
                            ? "Please save these login credentials. Your child will need them to log in."
                            : "Create a new student account for your child."}
                    </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                    {createdChildCredentials ? (
                        <div className="space-y-4 p-4 bg-muted rounded-lg border border-border">
                            <div>
                                <Label className="text-muted-foreground text-xs">Username</Label>
                                <p className="font-mono text-lg font-medium">{createdChildCredentials.username}</p>
                            </div>
                            <div>
                                <Label className="text-muted-foreground text-xs">Password</Label>
                                <p className="font-mono text-lg font-medium">{createdChildCredentials.password}</p>
                            </div>
                            <Button
                                className="w-full mt-4"
                                variant="hero"
                                onClick={handleClose}
                            >
                                Done
                            </Button>
                        </div>
                    ) : (
                        <>
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
                                    className="flex h-10 w-full rounded-xl border-2 border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 transition-all focus:border-primary/50"
                                    value={newChildData.classYear}
                                    onChange={(e) => setNewChildData({ ...newChildData, classYear: e.target.value })}
                                >
                                    <option value="" disabled>Select Class Year</option>
                                    <option value="year_6">Year 6 (Primary 6)</option>
                                    <option value="year_9">Year 9 (JSS 3)</option>
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
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Minimum 6 characters"
                                    value={newChildData.password}
                                    onChange={(e) => setNewChildData({ ...newChildData, password: e.target.value })}
                                    className="rounded-xl border-2 focus:border-primary/50"
                                />
                            </div>
                            <div className="flex gap-3 pt-4">
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
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
