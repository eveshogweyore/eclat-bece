import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface SchoolData {
  id: string;
  user_id: string;
  school_code: string;
  school_name: string | null;
  contact_email: string | null;
  address: string | null;
}

interface SchoolSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  school: SchoolData | null;
  onSuccess: (updated: Partial<SchoolData>) => void;
}

export function SchoolSettingsDialog({ open, onOpenChange, school, onSuccess }: SchoolSettingsDialogProps) {
  const [schoolName, setSchoolName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [address, setAddress] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (school) {
      setSchoolName(school.school_name || "");
      setContactEmail(school.contact_email || "");
      setAddress(school.address || "");
    }
  }, [school, open]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!school) return;

    if (!schoolName.trim()) {
      toast.error("School name is required");
      return;
    }

    setIsSaving(true);
    try {
      const updates = {
        school_name: schoolName.trim(),
        contact_email: contactEmail.trim() || null,
        address: address.trim() || null,
        updated_at: new Date().toISOString(),
      };

      const { error } = await supabase
        .from("schools")
        .update(updates)
        .eq("id", school.id);

      if (error) throw error;

      toast.success("School profile updated successfully!");
      onSuccess(updates);
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error updating school settings:", error);
      toast.error(error.message || "Failed to update school settings");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl">School Profile & Settings</DialogTitle>
          </div>
          <DialogDescription>
            Manage your school details. Students join your school from the Students page using their
            Link Code.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="school-name">School Name</Label>
            <Input
              id="school-name"
              placeholder="e.g. Corona Secondary School"
              value={schoolName}
              onChange={(e) => setSchoolName(e.target.value)}
              required
              maxLength={150}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="contact-email">Contact / Administrative Email</Label>
            <Input
              id="contact-email"
              type="email"
              placeholder="e.g. admin@school.edu"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              maxLength={255}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">School Address</Label>
            <Input
              id="address"
              placeholder="e.g. Victoria Island, Lagos"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              maxLength={250}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" variant="hero" disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
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
