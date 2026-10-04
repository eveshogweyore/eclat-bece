import { useState } from "react";
import { Briefcase, Mail, Phone, Check, Loader2 } from "lucide-react";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SchoolAddTeacherDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schoolId: string;
  onCreated?: () => void;
}

export function SchoolAddTeacherDialog({
  open,
  onOpenChange,
  schoolId,
  onCreated,
}: SchoolAddTeacherDialogProps) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [status, setStatus] = useState<"Active" | "On Leave" | "Inactive">("Active");
  const [isSaving, setIsSaving] = useState(false);
  const [createLogin, setCreateLogin] = useState(true);
  const [loginPassword, setLoginPassword] = useState("");

  const resetForm = () => {
    setFullName("");
    setEmail("");
    setPhone("");
    setStatus("Active");
    setCreateLogin(true);
    setLoginPassword("");
    setIsSaving(false);
  };

  const handleSaveTeacher = async () => {
    if (!fullName.trim()) {
      toast.error("Please enter the teacher's full name.");
      return;
    }

    if (createLogin) {
      const loginEmail = email.trim().toLowerCase();
      if (!loginEmail) {
        toast.error("A login email is required when creating a teacher account.");
        return;
      }
      if (loginPassword.length < 6) {
        toast.error("Login password must be at least 6 characters.");
        return;
      }
    }

    setIsSaving(true);
    try {
      const { data: teacherRow, error } = await supabase.from("school_teachers").insert({
        school_id: schoolId,
        full_name: fullName.trim(),
        email: email.trim() || null,
        phone: phone.trim() || null,
        status,
      })
      .select("id")
      .single();

      if (error) throw error;

      // Provision the login account (create-and-link) when requested.
      if (createLogin && teacherRow?.id) {
        const { data: { session } } = await supabase.auth.getSession();
        const { error: fnError } = await supabase.functions.invoke("create-teacher-account", {
          headers: session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : undefined,
          body: {
            teacher_id: teacherRow.id,
            email: email.trim().toLowerCase(),
            password: loginPassword,
          },
        });
        if (fnError) {
          toast.warning(
            "Teacher registered, but the login account could not be created. Use Edit → Create login to retry."
          );
        } else {
          toast.success("Faculty member registered with login access!");
        }
      } else {
        toast.success("Faculty member registered successfully!");
      }

      onCreated?.();
      handleClose();
    } catch (err: any) {
      console.error("Error adding teacher:", err);
      toast.error(err.message || "Failed to register faculty member");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    resetForm();
    onOpenChange(false);
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
                Register teachers and create their portal logins.
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

          {/* Login Access */}
          <div className="space-y-2 rounded-xl border border-border bg-muted/30 p-3">
            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <div>
                <p className="text-xs font-bold text-foreground">Create login account</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Lets this teacher sign in to the Teacher Portal and assign tasks to their classes.
                </p>
              </div>
              <input
                type="checkbox"
                checked={createLogin}
                onChange={(e) => setCreateLogin(e.target.checked)}
                className="h-4 w-4 rounded accent-primary cursor-pointer"
              />
            </label>
            {createLogin && (
              <div className="space-y-2 pt-1">
                <div className="space-y-1.5">
                  <Label htmlFor="login-email" className="text-xs text-muted-foreground font-semibold">
                    Login Email *
                  </Label>
                  <Input
                    id="login-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="teacher@school.edu"
                    className="border-[#34415b] bg-background text-white text-xs h-9"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="login-password" className="text-xs text-muted-foreground font-semibold">
                    Temporary Password *
                  </Label>
                  <Input
                    id="login-password"
                    type="text"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="At least 6 characters — share it with the teacher"
                    className="border-[#34415b] bg-background text-white text-xs h-9"
                  />
                  <p className="text-[10px] text-muted-foreground">
                    Share these credentials with the teacher privately. They can change the password later.
                  </p>
                </div>
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
