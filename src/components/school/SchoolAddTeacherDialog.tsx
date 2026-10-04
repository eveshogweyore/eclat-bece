import { useState } from "react";
import { Briefcase, Mail, Phone, Building2, BookOpen, Check, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SchoolClassItem } from "@/hooks/useSchoolData";
import { useSubjects } from "@/hooks/useSubjects";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SchoolAddTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  classes: SchoolClassItem[];
  onCreated?: () => void;
}

const DEPARTMENTS = [
  "Sciences & Technology",
  "Mathematics & Numeracy",
  "Languages & English Studies",
  "Pre-Vocational & Business Studies",
  "Humanities & National Values",
  "Creative & Cultural Arts",
  "General / Administrative Faculty",
];

export function SchoolAddTeacherDialog({
  open,
  onOpenChange,
  schoolId,
  classes,
  onCreated,
}: SchoolAddTeacherDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState(DEPARTMENTS[0]);
  const [primarySubject, setPrimarySubject] = useState("");
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [status, setStatus] = useState<"Active" | "On Leave" | "Inactive">("Active");
  const [isSaving, setIsSaving] = useState(false);

  const { subjects } = useSubjects({ onlyActive: true });

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setDepartment(DEPARTMENTS[0]);
    setPrimarySubject("");
    setSelectedClassIds([]);
    setStatus("Active");
    setIsSaving(false);
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
  };

  const toggleClassSelect = (classId: string) => {
    setSelectedClassIds((prev) =>
      prev.includes(classId) ? prev.filter((id) => id !== classId) : [...prev, classId]
    );
  };

  const handleSaveTeacher = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter the teacher's full name.");
      return;
    }

    setIsSaving(true);
    try {
      const { error } = await supabase.from("school_teachers").insert({
        school_id: schoolId,
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        department: department.trim() || null,
        primary_subject: primarySubject.trim() || null,
        assigned_class_ids: selectedClassIds,
        status,
      });

      if (error) throw error;

      // Optional sync: update assigned classes' lead_teacher if currently empty
      if (selectedClassIds.length > 0) {
        for (const cid of selectedClassIds) {
          const targetClass = classes.find((c) => c.id === cid);
          if (targetClass && !targetClass.lead_teacher) {
            await supabase
              .from("school_classes")
              .update({ lead_teacher: fullName.trim() })
              .eq("id", cid);
          }
        }
      }

      toast.success("Faculty member registered successfully!");
      onCreated?.();
      handleClose();
    } catch (err: any) {
      console.error("Error adding teacher:", err);
      toast.error(err.message || "Failed to register faculty member");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="border-border bg-card text-foreground w-[95vw] sm:max-w-xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader className="border-b border-[#1f2b42] pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-sky-500/10 text-[#3bc2f3] border border-sky-500/20">
              <Briefcase className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-white">Add Faculty Member</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground">
                Register teachers, assign academic departments, and allocate class arm responsibilities.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4 text-xs">
          {/* Full Name */}
          <div className="space-y-1.5">
            <Label htmlFor="teacher-name" className="text-xs text-muted-foreground font-semibold">
              Full Name & Title *
            </Label>
            <Input
              id="teacher-name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Dr. Kemi Balogun / Mr. Babatunde Fashola"
              className="border-[#34415b] bg-background text-white text-xs h-9"
            />
          </div>

          {/* Email & Phone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="teacher-email" className="text-xs text-muted-foreground font-semibold">
                Email Address
              </Label>
              <Input
                id="teacher-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="teacher@school.edu"
                className="border-[#34415b] bg-background text-white text-xs h-9"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teacher-phone" className="text-xs text-muted-foreground font-semibold">
                Phone Number
              </Label>
              <Input
                id="teacher-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+234 803 123 4567"
                className="border-[#34415b] bg-background text-white text-xs h-9"
              />
            </div>
          </div>

          {/* Department & Primary Subject */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="teacher-dept" className="text-xs text-muted-foreground font-semibold">
                Department
              </Label>
              <select
                id="teacher-dept"
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="h-9 w-full rounded-lg border border-[#34415b] bg-background px-3 text-xs text-white"
              >
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="teacher-subject" className="text-xs text-muted-foreground font-semibold">
                Primary Subject
              </Label>
              <Input
                id="teacher-subject"
                value={primarySubject}
                onChange={(e) => setPrimarySubject(e.target.value)}
                placeholder="e.g. Mathematics, English"
                className="border-[#34415b] bg-background text-white text-xs h-9"
              />
            </div>
          </div>

          {/* Assigned Class Arms */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground font-semibold">
              Assigned Class Arms ({selectedClassIds.length} allocated)
            </Label>
            {classes.length === 0 ? (
              <p className="text-slate-500 italic text-[11px] p-2 rounded-lg bg-background border border-[#233148]">
                No classes registered yet. You can allocate class arms once classes are created.
              </p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 rounded-xl border border-[#233148] bg-background p-3 max-h-36 overflow-y-auto">
                {classes.map((cls) => {
                  const isChecked = selectedClassIds.includes(cls.id);
                  return (
                    <label
                      key={cls.id}
                      className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 cursor-pointer text-xs transition-colors ${
                        isChecked
                          ? "border-sky-500/40 bg-sky-500/10 text-white font-medium"
                          : "border-border bg-card text-muted-foreground hover:text-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleClassSelect(cls.id)}
                        className="h-3.5 w-3.5 rounded accent-sky-400 cursor-pointer"
                      />
                      <span className="truncate">{cls.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="border-t border-[#1f2b42] pt-3">
          <Button
            variant="outline"
            onClick={handleClose}
            className="border-[#34415b] text-muted-foreground hover:text-white text-xs"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveTeacher}
            disabled={isSaving}
            className="bg-[#3bc2f3] text-[#041c2d] hover:bg-[#6cd8ff] font-bold text-xs"
          >
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Register Teacher
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default SchoolAddTeacherDialog;
