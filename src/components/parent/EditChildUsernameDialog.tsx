import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Fingerprint } from "lucide-react";

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

interface EditChildUsernameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    child: { id: string; profile: { username?: string } } | null;
    onSuccess: () => void;
}

export function EditChildUsernameDialog({ open, onOpenChange, child, onSuccess }: EditChildUsernameDialogProps) {
    const [username, setUsername] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (child) {
            setUsername(child.profile.username || "");
        }
    }, [child, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!child || !username.trim()) return;

        const normalizedUsername = username.trim().toLowerCase();

        if (normalizedUsername.length < 2 || normalizedUsername.length > 20) {
            toast.error("Username must be between 2 and 20 characters");
            return;
        }

        if (normalizedUsername === child.profile.username?.toLowerCase()) {
            onOpenChange(false);
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke("manage-student-account", {
                body: {
                    studentId: child.id,
                    action: "edit-username",
                    username: normalizedUsername,
                },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success("Username updated successfully");
            onSuccess();
            onOpenChange(false);
        } catch (error: unknown) {
            console.error("Error updating username:", error);
            toast.error(getErrorMessage(error, "Failed to update username"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-2 shadow-2xl">
                <DialogHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                        <Fingerprint className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight">Edit Username</DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground">
                        Change your child's login username. It must be unique.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="username" className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
                            Username
                        </Label>
                        <Input
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, '').toLowerCase())}
                            placeholder="e.g. jdoe123"
                            className="h-12 rounded-xl border-2 font-mono focus:border-primary/50 lowercase"
                            required
                        />
                        <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1.5 px-1">
                            Username must be 2-20 characters, lowercase, and contain no spaces.
                        </p>
                    </div>
                    <DialogFooter className="pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl font-bold border-2 h-12 px-6"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            variant="hero"
                            disabled={isSubmitting || !username.trim() || username.trim().toLowerCase() === child?.profile.username?.toLowerCase()}
                            className="rounded-xl font-black h-12 px-8 shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Checking...
                                </>
                            ) : (
                                "Update Username"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
