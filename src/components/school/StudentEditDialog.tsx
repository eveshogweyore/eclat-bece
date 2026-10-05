import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  student: {
    id: string;
    name: string;
    class_year: "year_6" | "year_9" | null;
    class_id?: string | null;
  } | null;
  /** Classes of the school, for the Class arm dropdown. */
  classes: Array<{ id: string; name: string; class_year: string | null }>;
  onSaved: () => void;
}

/**
 * Edit a school-provisioned student: full name, cohort, and class arm.
 * Backed by manage-student-account (edit-name / set-class), which authorizes
 * the school that owns the student.
 */
export function StudentEditDialog({ open, onOpenChange, student, classes, onSaved }: StudentEditDialogProps) {
  const [fullName, setFullName] = useState("");
  const [classYear, setClassYear] = useState("year_9");
  const [classId, setClassId] = useState("none");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (open && student) {
      setFullName(student.name);
      setClassYear(student.class_year === "year_6" ? "year_6" : "year_9");
      setClassId(student.class_id || "none");
    }
  }, [open, student]);

  const handleSave = async () => {
    if (!student) return;
    if (fullName.trim().length < 2) {
      toast.error("Full name must be at least 2 characters");
      return;
    }

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const headers = session?.access_token
        ? { Authorization: `Bearer ${session.access_token}` }
        : undefined;

      const { error: nameError } = await supabase.functions.invoke("manage-student-account", {
        headers,
        body: { studentId: student.id, action: "edit-name", fullName: fullName.trim() },
      });
      if (nameError) throw nameError;

      const cleanClassId = classId === "none" ? null : classId;
      const { error: classError } = await supabase.functions.invoke("manage-student-account", {
        headers,
        body: {
          studentId: student.id,
          action: "set-class",
          classYear,
          classId: cleanClassId,
        },
      });
      if (classError) throw classError;

      toast.success("Student updated successfully");
      onSaved();
      onOpenChange(false);
    } catch (err: any) {
      console.error("Error updating student:", err);
      toast.error(err.message || "Failed to update student");
    } finally {
      setIsSaving(false);
    }
  };

  const cohortClasses = classes.filter((c) => c.class_year === classYear);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-card text-foreground w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold">Edit student</DialogTitle>
          <DialogDescription>Update the student's name, cohort, or class arm.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2 text-xs">
          <div className="space-y-1.5">
            <Label htmlFor="edit-student-name" className="text-xs text-muted-foreground font-semibold">
              Full name
            </Label>
            <Input
              id="edit-student-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              maxLength={100}
              className="border-[#34415b] bg-background text-white text-xs h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-student-cohort" className="text-xs text-muted-foreground font-semibold">
              Cohort
            </Label>
            <select
              id="edit-student-cohort"
              value={classYear}
              onChange={(e) => {
                setClassYear(e.target.value);
                setClassId("none");
              }}
              className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
            >
              <option value="year_6">Year 6 (Primary 6)</option>
              <option value="year_9">Year 9 (JSS 3)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="edit-student-class" className="text-xs text-muted-foreground font-semibold">
              Class arm (optional)
            </Label>
            <select
              id="edit-student-class"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
            >
              <option value="none">No class arm</option>
              {cohortClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving} className="text-xs font-bold">
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
