import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorUtils";

export default function StudentOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [classYear, setClassYear] = useState("");
  const [schoolCode, setSchoolCode] = useState("");
  const [parentCode, setParentCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast({
          title: "Error",
          description: "User not found. Please sign in again.",
          variant: "destructive",
        });
        navigate("/auth");
        return;
      }

      // Find school if school code provided using secure lookup function
      let schoolId = null;
      if (schoolCode.trim()) {
        const { data: schoolData, error: schoolError } = await supabase
          .rpc("lookup_school_by_code", { _school_code: schoolCode.toUpperCase() });
        
        if (schoolError) {
          console.error("Error looking up school:", schoolError);
        } else if (schoolData && schoolData.length > 0) {
          schoolId = schoolData[0].id;
        }
      }

      // Find parent if parent code provided
      let parentId = null;
      if (parentCode.trim()) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("id")
          .eq("unique_id", parentCode.toUpperCase())
          .single();
        
        if (profileData) {
          const { data: parentData } = await supabase
            .from("parents")
            .select("user_id")
            .eq("user_id", profileData.id)
            .single();
          
          parentId = parentData?.user_id || null;
        }
      }

      // Update student record
      const { error: updateError } = await supabase
        .from("students")
        .update({
          class_year: classYear === "year6" ? "year_6" : "year_9",
          school_id: schoolId,
          parent_id: parentId,
          onboarding_completed: true,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Welcome to Éclat!",
        description: "Your profile has been set up successfully.",
      });

      navigate("/dashboard/student");
    } catch (error: any) {
      toast({
        title: "Setup Failed",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <BookOpen className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-foreground">Éclat</h1>
          </div>
          <p className="text-muted-foreground">Complete your profile</p>
        </div>

        <Card className="border-2 animate-scale-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Student Profile Setup</CardTitle>
            <CardDescription className="text-center">
              Tell us a bit about yourself to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class Year *</Label>
                <Select value={classYear} onValueChange={setClassYear} required>
                  <SelectTrigger id="class">
                    <SelectValue placeholder="Select your class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="year6">Year 6 (Common Entrance)</SelectItem>
                    <SelectItem value="year9">Year 9 (BECE)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-code">School Code (Optional)</Label>
                <Input
                  id="school-code"
                  type="text"
                  placeholder="Enter your school code"
                  value={schoolCode}
                  onChange={(e) => setSchoolCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Ask your teacher for your school code
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="parent-code">Parent Code (Optional)</Label>
                <Input
                  id="parent-code"
                  type="text"
                  placeholder="Enter your parent's code"
                  value={parentCode}
                  onChange={(e) => setParentCode(e.target.value.toUpperCase())}
                  maxLength={8}
                />
                <p className="text-xs text-muted-foreground">
                  Ask your parent for their unique code
                </p>
              </div>

              <Button
                type="submit"
                variant="hero"
                className="w-full"
                disabled={isSubmitting || !classYear}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Setting up...
                  </>
                ) : (
                  "Complete Setup"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
