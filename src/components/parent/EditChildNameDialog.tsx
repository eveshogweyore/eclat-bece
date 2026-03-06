import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, User } from "lucide-react";

interface EditChildNameDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    child: { id: string; profile: { full_name: string } } | null;
    onSuccess: () => void;
}

export function EditChildNameDialog({ open, onOpenChange, child, onSuccess }: EditChildNameDialogProps) {
    const [fullName, setFullName] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (child) {
            setFullName(child.profile.full_name || "");
        }
    }, [child, open]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!child || !fullName.trim()) return;

        setIsSubmitting(true);
        try {
            const { data, error } = await supabase.functions.invoke("manage-student-account", {
                body: {
                    studentId: child.id,
                    action: "edit-name",
                    fullName: fullName.trim(),
                },
            });

            if (error) throw error;

            toast.success("Student name updated successfully");
            onSuccess();
            onOpenChange(false);
        } catch (error: any) {
            console.error("Error updating name:", error);
            toast.error(error.message || "Failed to update name");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] border-2 shadow-2xl">
                <DialogHeader>
                    <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center mb-2">
                        <User className="w-6 h-6 text-primary" />
                    </div>
                    <DialogTitle className="text-2xl font-black tracking-tight">Edit Student Name</DialogTitle>
                    <DialogDescription className="font-medium text-muted-foreground">
                        Update the display name for your child's account.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-sm font-bold uppercase tracking-widest text-muted-foreground/70">
                            Full Name
                        </Label>
                        <Input
                            id="fullName"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="e.g. John Doe"
                            className="h-12 rounded-xl border-2 font-medium focus:border-primary/50"
                            required
                        />
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
                            disabled={isSubmitting || !fullName.trim() || fullName.trim() === child?.profile.full_name}
                            className="rounded-xl font-black h-12 px-8 shadow-lg shadow-primary/20"
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                    Updating...
                                </>
                            ) : (
                                "Save Changes"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
