import { useEffect, useState } from "react";
import { Link2, Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LinkedStudent {
  student_id: string;
  full_name: string | null;
  unique_id: string;
  class_year: string | null;
  parent_id: string | null;
}

interface SchoolLinkStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a student is successfully linked, to refresh the roster. */
  onLinked?: () => void;
}

/**
 * Links an existing student account to this school using the student's
 * Link Code (profiles.unique_id). The link is instant — the code is a secret
 * the student shares deliberately — and the student is notified. Backed by
 * the link_student_to_school RPC, which refuses students already linked to a
 * different school.
 */
export function SchoolLinkStudentDialog({ open, onOpenChange, onLinked }: SchoolLinkStudentDialogProps) {
  const [code, setCode] = useState("");
  const [linked, setLinked] = useState<LinkedStudent | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      setCode("");
      setLinked(null);
    }
  }, [open]);

  const close = () => {
    setCode("");
    setLinked(null);
    onOpenChange(false);
  };

  const linkStudent = async () => {
    if (!code.trim()) {
      toast.error("Enter the student's link code");
      return;
    }
    setIsSaving(true);
    try {
      const { data, error } = await supabase.rpc("link_student_to_school", {
        p_student_code: code.trim(),
      });
      if (error) throw error;
      const student = Array.isArray(data) ? data[0] : data;
      if (!student?.student_id) throw new Error("No student found with that link code");

      setLinked(student);
      toast.success(`${student.full_name || "Student"} linked to your school`);
      onLinked?.();
    } catch (error) {
      console.error("Error linking student:", error);
      // Surface the RPC's message verbatim ("No student found with that link
      // code", "Student is already linked to a school", ...).
      toast.error(error instanceof Error ? error.message : "Failed to link student");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-muted/40 text-foreground w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Link existing student</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {linked
              ? "The student is now part of your school directory."
              : "Ask the student for the Link Code shown on their dashboard."}
          </DialogDescription>
        </DialogHeader>

        {linked ? (
          <div className="space-y-4 py-3">
            <div className="flex items-start gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
              <CheckCircle2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-400" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-foreground">{linked.full_name || "Student"}</p>
                <p className="font-mono text-xs text-muted-foreground">{linked.unique_id}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {linked.parent_id
                    ? "This student keeps their parent link — both can now follow their progress."
                    : "Use Edit to place them in a cohort and class arm."}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-3">
            <div className="space-y-2">
              <Label htmlFor="student-link-code">Student link code</Label>
              <Input
                id="student-link-code"
                value={code}
                onChange={(event) => setCode(event.target.value.toUpperCase())}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !isSaving) linkStudent();
                }}
                placeholder="e.g. FIEBX3CK"
                maxLength={8}
                autoFocus
                autoComplete="off"
                className="border-[#34415b] bg-[#0f182b] font-mono text-lg tracking-[0.3em] uppercase text-white placeholder:text-muted-foreground/50"
              />
              <p className="text-[11px] text-muted-foreground">
                Linking is instant and the student is notified. Students already belonging to another
                school cannot be linked.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {linked ? (
            <Button onClick={close} className="bg-[#2184a7] text-white hover:bg-[#2c9bc2]">
              Done
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={close} className="border-[#34415b] text-slate-200">
                Cancel
              </Button>
              <Button onClick={linkStudent} disabled={isSaving} className="bg-[#2184a7] text-white hover:bg-[#2c9bc2]">
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Link2 className="mr-2 h-4 w-4" />
                )}
                Link student
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
