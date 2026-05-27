import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Building2, UserPlus } from "lucide-react";

const getToastDescription = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback;

interface AccountSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AccountSettingsDialog = ({ open, onOpenChange }: AccountSettingsDialogProps) => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [parentCode, setParentCode] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);
  const [currentSchoolId, setCurrentSchoolId] = useState<string | null>(null);
  const [schoolName, setSchoolName] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      loadConnectionData();
    }
  }, [open]);

  const loadConnectionData = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get student data
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("parent_id, school_id")
        .eq("user_id", user.id)
        .single();

      if (studentError) throw studentError;

      setCurrentParentId(studentData.parent_id);
      setCurrentSchoolId(studentData.school_id);

      // If school is connected, get school name
      if (studentData.school_id) {
        const { data: schoolData } = await supabase
          .from("schools")
          .select("school_name")
          .eq("id", studentData.school_id)
          .single();

        if (schoolData) {
          setSchoolName(schoolData.school_name);
        }
      }
    } catch (error: unknown) {
      console.error("Error loading connection data:", error);
      toast({
        title: "Error",
        description: getToastDescription(error, "Failed to load connection information"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleConnectParent = async () => {
    if (!parentCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a parent code",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Find parent by unique_id
      const { data: parentProfile, error: parentError } = await supabase
        .from("profiles")
        .select("id")
        .eq("unique_id", parentCode.trim().toUpperCase())
        .single();

      if (parentError || !parentProfile) {
        toast({
          title: "Error",
          description: "Invalid parent code. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if the profile belongs to a parent
      const { data: parentData, error: parentCheckError } = await supabase
        .from("parents")
        .select("id")
        .eq("user_id", parentProfile.id)
        .single();

      if (parentCheckError || !parentData) {
        toast({
          title: "Error",
          description: "This code does not belong to a parent account.",
          variant: "destructive",
        });
        return;
      }

      // Update student with parent_id
      const { error: updateError } = await supabase
        .from("students")
        .update({ parent_id: parentData.id })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setCurrentParentId(parentData.id);
      setParentCode("");
      
      toast({
        title: "Success",
        description: "Successfully connected to parent account!",
      });
    } catch (error: unknown) {
      console.error("Error connecting to parent:", error);
      toast({
        title: "Error",
        description: getToastDescription(error, "Failed to connect to parent account"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConnectSchool = async () => {
    if (!schoolCode.trim()) {
      toast({
        title: "Error",
        description: "Please enter a school code",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Use the lookup_school_by_code function
      const { data: schoolData, error: schoolError } = await supabase
        .rpc("lookup_school_by_code", { _school_code: schoolCode.trim().toUpperCase() });

      if (schoolError || !schoolData || schoolData.length === 0) {
        toast({
          title: "Error",
          description: "Invalid school code. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      const school = schoolData[0];

      // Update student with school_id
      const { error: updateError } = await supabase
        .from("students")
        .update({ school_id: school.id })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      setCurrentSchoolId(school.id);
      setSchoolName(school.school_name);
      setSchoolCode("");
      
      toast({
        title: "Success",
        description: `Successfully connected to ${school.school_name}!`,
      });
    } catch (error: unknown) {
      console.error("Error connecting to school:", error);
      toast({
        title: "Error",
        description: getToastDescription(error, "Failed to connect to school"),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-[500px]">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Account Connections</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Parent Connection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">Parent Account</h3>
            </div>
            
            {currentParentId ? (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  ✓ Connected to parent account
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="parentCode">Parent Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="parentCode"
                    placeholder="Enter parent code"
                    value={parentCode}
                    onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                  <Button 
                    onClick={handleConnectParent}
                    disabled={isSubmitting || !parentCode.trim()}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask your parent for their unique code
                </p>
              </div>
            )}
          </div>

          {/* School Connection */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-muted-foreground" />
              <h3 className="font-semibold">School Account</h3>
            </div>
            
            {currentSchoolId ? (
              <div className="p-3 rounded-lg bg-muted">
                <p className="text-sm text-muted-foreground">
                  ✓ Connected to {schoolName || "school"}
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="schoolCode">School Code</Label>
                <div className="flex gap-2">
                  <Input
                    id="schoolCode"
                    placeholder="Enter school code"
                    value={schoolCode}
                    onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                    maxLength={8}
                  />
                  <Button 
                    onClick={handleConnectSchool}
                    disabled={isSubmitting || !schoolCode.trim()}
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      "Connect"
                    )}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ask your teacher for the school code
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
