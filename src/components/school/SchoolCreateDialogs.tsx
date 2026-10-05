import { useEffect, useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { getEdgeFunctionError } from "@/lib/errorUtils";
import { toast } from "sonner";

interface CreateClassDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Registered teachers of the school, for the Lead teacher dropdown. */
  teachers?: Array<{ id: string; full_name: string }>;
  /** When set, the dialog edits this existing class instead of creating. */
  editClass?: { id: string; name: string; level: string; lead_teacher: string | null } | null;
  onCreated?: () => void;
}

const LEVEL_TO_CLASS_YEAR: Record<string, "year_6" | "year_9"> = {
  "Primary 6": "year_6",
  "JSS 3": "year_9",
};

export function CreateClassDialog({
  open,
  onOpenChange,
  teachers = [],
  editClass,
  onCreated,
}: CreateClassDialogProps) {
  const isEdit = !!editClass;
  const [name, setName] = useState("");
  const [level, setLevel] = useState("JSS 3");
  const [teacher, setTeacher] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // Hydrate from the class being edited.
  useEffect(() => {
    if (open && editClass) {
      setName(editClass.name);
      setLevel(LEVEL_TO_CLASS_YEAR[editClass.level] ? editClass.level : "JSS 3");
      setTeacher(editClass.lead_teacher || "");
    }
    if (!open) {
      setName("");
      setLevel("JSS 3");
      setTeacher("");
    }
  }, [open, editClass]);

  const close = () => {
    setName("");
    setLevel("JSS 3");
    setTeacher("");
    onOpenChange(false);
  };

  const saveClass = async () => {
    if (!name.trim() || !level.trim()) {
      toast.error("Class name and level are required");
      return;
    }

    setIsSaving(true);
    try {
      const classYear = LEVEL_TO_CLASS_YEAR[level];

      if (isEdit && editClass) {
        // Rename / re-cohort / reassign lead. Enrolled students' class_year
        // follows the class so the class arm stays a single cohort.
        const { error: updateError } = await supabase
          .from("school_classes")
          .update({
            name: name.trim(),
            level: level.trim(),
            class_year: classYear,
            lead_teacher: teacher.trim() || null,
          })
          .eq("id", editClass.id);
        if (updateError) throw updateError;

        if (editClass.level !== level) {
          const { error: studentsError } = await supabase
            .from("students")
            .update({ class_year: classYear })
            .eq("class_id", editClass.id);
          if (studentsError) throw studentsError;
        }

        toast.success("Class updated successfully");
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Your session has expired");

        const { data: school, error: schoolError } = await supabase
          .from("schools")
          .select("id")
          .eq("user_id", user.id)
          .single();
        if (schoolError || !school) throw schoolError || new Error("School profile not found");

        const { error } = await supabase.from("school_classes").insert({
          school_id: school.id,
          name: name.trim(),
          level: level.trim(),
          class_year: classYear,
          lead_teacher: teacher.trim() || null,
        });
        if (error) throw error;

        toast.success("Class created successfully");
      }
      onCreated?.();
      close();
    } catch (error) {
      console.error("Error saving class:", error);
      toast.error(error instanceof Error ? error.message : "Failed to save class");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-muted/40 text-foreground w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">{isEdit ? "Edit class" : "Create new class"}</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isEdit
              ? "Update the class name, cohort, or lead teacher."
              : "Add a class to your school directory and assign its lead teacher."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-3">
          <div className="space-y-2"><Label htmlFor="class-name">Class name</Label><Input id="class-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. JSS 3A" className="border-[#34415b] bg-[#0f182b] text-white" /></div>
          <div className="space-y-2"><Label htmlFor="class-level">Level</Label><select id="class-level" value={level} onChange={(event) => setLevel(event.target.value)} className="h-10 w-full rounded-md border border-[#34415b] bg-[#0f182b] px-3 text-sm text-white"><option value="Primary 6">Primary 6 (Common Entrance)</option><option value="JSS 3">JSS 3 (BECE)</option></select></div>
          <div className="space-y-2"><Label htmlFor="lead-teacher">Lead teacher <span className="text-slate-500">(optional)</span></Label><select id="lead-teacher" value={teacher} onChange={(event) => setTeacher(event.target.value)} className="h-10 w-full rounded-md border border-[#34415b] bg-[#0f182b] px-3 text-sm text-white"><option value="">Unassigned</option>{teachers.map((t) => (<option key={t.id} value={t.full_name}>{t.full_name}</option>))}</select></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={close} className="border-[#34415b] text-slate-200">Cancel</Button><Button onClick={saveClass} disabled={isSaving} className="bg-[#2184a7] text-white hover:bg-[#2c9bc2]">{isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{isEdit ? "Save changes" : "Create class"}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CreateStudentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  classes?: Array<{ id: string; name: string; level: string; class_year?: string | null }>;
  onCreated?: (student: { fullName: string; classYear: string; username: string }) => void;
}

export function CreateStudentDialog({ open, onOpenChange, classes = [], onCreated }: CreateStudentDialogProps) {
  const [fullName, setFullName] = useState("");
  const [classYear, setClassYear] = useState("year_9");
  const [selectedClassId, setSelectedClassId] = useState<string>("none");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const close = () => {
    setFullName("");
    setClassYear("year_9");
    setSelectedClassId("none");
    setUsername("");
    setPassword("");
    setCredentials(null);
    setShowPassword(false);
    onOpenChange(false);
  };

  const createStudent = async () => {
    if (!fullName.trim() || !username.trim() || password.length < 6) {
      toast.error("Enter a name, username, and password of at least 6 characters");
      return;
    }
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) throw new Error("Your session has expired");
      const { data, error } = await supabase.functions.invoke("create-student-account", {
        body: {
          fullName,
          classYear,
          username,
          password,
          classId: selectedClassId !== "none" ? selectedClassId : undefined,
        },
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (error) throw new Error(await getEdgeFunctionError(error, "Failed to create student account"));
      if (data?.error) throw new Error(data.error);

      // Backup check: set class_id if returned
      if (data?.student?.id && selectedClassId !== "none") {
        await supabase
          .from("students")
          .update({ class_id: selectedClassId })
          .eq("id", data.student.id);
      }

      const normalizedUsername = username.trim().toLowerCase();
      setCredentials({ username: normalizedUsername, password });
      onCreated?.({ fullName: fullName.trim(), classYear, username: normalizedUsername });
      toast.success("Student account created successfully");
    } catch (error) {
      console.error("Error creating student:", error);
      toast.error(error instanceof Error ? error.message : "Failed to create student account");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-border bg-muted/40 text-foreground w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="text-xl text-white">Add new student</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Create a school-managed student login and place them in an exam cohort.
          </DialogDescription>
        </DialogHeader>
        {credentials ? (
          <div className="space-y-4 py-3">
            <div className="rounded-lg border border-border bg-[#0f182b] p-4">
              <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">Student login</p>
              <p className="mt-3 font-mono text-white">Username: {credentials.username}</p>
              <p className="mt-1 font-mono text-white">Password: {credentials.password}</p>
            </div>
            <Button onClick={close} className="w-full bg-[#2184a7] text-white">Done</Button>
          </div>
        ) : (
          <>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="student-name">Full name</Label>
                <Input
                  id="student-name"
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="e.g. Ada Okafor"
                  className="border-[#34415b] bg-[#0f182b] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-cohort">Cohort</Label>
                <select
                  id="student-cohort"
                  value={classYear}
                  onChange={(event) => setClassYear(event.target.value)}
                  className="h-10 w-full rounded-md border border-[#34415b] bg-[#0f182b] px-3 text-sm text-white"
                >
                  <option value="year_6">Year 6 / Primary 6</option>
                  <option value="year_9">Year 9 / JSS 3</option>
                </select>
              </div>
              {classes.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="student-class">Class Arm <span className="text-slate-500">(optional)</span></Label>
                  <select
                    id="student-class"
                    value={selectedClassId}
                    onChange={(event) => setSelectedClassId(event.target.value)}
                    className="h-10 w-full rounded-md border border-[#34415b] bg-[#0f182b] px-3 text-sm text-white"
                  >
                    <option value="none">Unassigned / General Cohort</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name} ({cls.level})
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="student-username">Username</Label>
                <Input
                  id="student-username"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  placeholder="e.g. ada.okafor"
                  className="border-[#34415b] bg-[#0f182b] text-white"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="student-password">Password</Label>
                <div className="relative">
                  <Input
                    id="student-password"
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimum 6 characters"
                    className="border-[#34415b] bg-[#0f182b] pr-10 text-white"
                  />
                  <button
                    type="button"
                    aria-label="Toggle password visibility"
                    onClick={() => setShowPassword((visible) => !visible)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={close} className="border-[#34415b] text-slate-200">Cancel</Button>
              <Button onClick={createStudent} disabled={isSaving} className="bg-[#2184a7] text-white hover:bg-[#2c9bc2]">
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Create student
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
