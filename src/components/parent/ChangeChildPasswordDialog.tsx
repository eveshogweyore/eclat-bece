import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Key, Eye, EyeOff } from "lucide-react";

const getErrorMessage = (error: unknown, fallback: string) =>
    error instanceof Error ? error.message : fallback;

interface ChangeChildPasswordDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    child: { id: string; profile: { full_name: string } } | null;
}

export function ChangeChildPasswordDialog({ open, onOpenChange, child }: ChangeChildPasswordDialogProps) {
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!child) return;

        if (password.length < 6) {
            toast.error("Password must be at least 6 characters long");
            return;
        }

        if (password !== confirmPassword) {
            toast.error("Passwords do not match");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke("manage-student-account", {
                body: {
                    studentId: child.id,
                    action: "change-password",
                    password,
                },
            });

            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            toast.success(`Password for ${child.profile.full_name} has been reset`);
            onOpenChange(false);
            setPassword("");
            setConfirmPassword("");
        } catch (error: unknown) {
            console.error("Error changing password:", error);
            toast.error(getErrorMessage(error, "Failed to change password"));
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-2 shadow-2xl">
                <DialogHeader>
                    <div className="w-12 h-12 bg-amber-500/10 rounded-2xl flex items-center justify-center mb-2">
                        <Key className="w-6 h-6 text-amber-600" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight">Change Password</DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground">
                        Set a new password for <span className="text-foreground font-bold">{child?.profile.full_name}</span>.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="newPassword" className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
                                New Password
                            </Label>
                            <div className="relative group">
                                <Input
                                    id="newPassword"
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="Minimum 6 characters"
                                    className="h-12 rounded-xl border-2 font-medium focus:border-amber-500/50 pr-12 transition-all"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
                                Confirm Password
                            </Label>
                            <Input
                                id="confirmPassword"
                                type={showPassword ? "text" : "password"}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                placeholder="Repeat new password"
                                className="h-12 rounded-xl border-2 font-medium focus:border-amber-500/50"
                                required
                            />
                        </div>
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
                            disabled={isSubmitting || !password || password !== confirmPassword}
                            className="rounded-xl font-black h-12 px-8 bg-amber-600 hover:bg-amber-700 shadow-lg shadow-amber-600/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Resetting...
                                </>
                            ) : (
                                "Update Password"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
