import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Loader2, Plus, X, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import { Badge } from "@/components/ui/badge";
import { z } from "zod";

const studentCodeSchema = z.string()
  .trim()
  .length(8, "Student code must be exactly 8 characters")
  .regex(/^[A-Z0-9]+$/, "Student code must contain only uppercase letters and numbers");

interface LinkedChild {
  id: string;
  full_name: string;
  unique_id: string;
  class_year: string;
}

export default function ParentOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [studentCode, setStudentCode] = useState("");
  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [parentUserId, setParentUserId] = useState<string | null>(null);

  useEffect(() => {
    const fetchParentData = async () => {
      try {
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        
        if (userError || !user) {
          toast({
            title: "Authentication Required",
            description: "Please sign in to continue.",
            variant: "destructive",
          });
          navigate("/auth?role=parent");
          return;
        }

        setParentUserId(user.id);

        // Check if parent already has linked children
        const { data: children, error: childrenError } = await supabase
          .from("students")
          .select(`
            id,
            user_id,
            class_year,
            profiles!inner(full_name, unique_id)
          `)
          .eq("parent_id", user.id);

        if (childrenError) {
          console.error("Error fetching children:", childrenError);
        } else if (children && children.length > 0) {
          const formattedChildren = children.map((child: any) => ({
            id: child.id,
            full_name: child.profiles.full_name || "Unknown",
            unique_id: child.profiles.unique_id,
            class_year: child.class_year || "Unknown",
          }));
          setLinkedChildren(formattedChildren);
        }
      } catch (error) {
        console.error("Error fetching parent data:", error);
        toast({
          title: "Error",
          description: "An unexpected error occurred.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchParentData();
  }, [navigate, toast]);

  const handleAddChild = async () => {
    if (!parentUserId) return;

    try {
      // Validate student code
      const validated = studentCodeSchema.parse(studentCode);
      setIsAddingChild(true);

      // Find student by unique_id (student code)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, unique_id")
        .eq("unique_id", validated)
        .maybeSingle();

      if (profileError || !profileData) {
        toast({
          title: "Student Not Found",
          description: "No student found with this code. Please check and try again.",
          variant: "destructive",
        });
        return;
      }

      // Check if this profile has a student record
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("id, parent_id, class_year")
        .eq("user_id", profileData.id)
        .maybeSingle();

      if (studentError || !studentData) {
        toast({
          title: "Invalid Code",
          description: "This code does not belong to a student account.",
          variant: "destructive",
        });
        return;
      }

      // Check if student is already linked to this parent
      if (linkedChildren.some(child => child.id === studentData.id)) {
        toast({
          title: "Already Linked",
          description: "This student is already linked to your account.",
          variant: "destructive",
        });
        return;
      }

      // Check if student is already linked to another parent
      if (studentData.parent_id && studentData.parent_id !== parentUserId) {
        toast({
          title: "Already Linked",
          description: "This student is already linked to another parent account.",
          variant: "destructive",
        });
        return;
      }

      // Link student to parent
      const { error: updateError } = await supabase
        .from("students")
        .update({ parent_id: parentUserId })
        .eq("id", studentData.id);

      if (updateError) throw updateError;

      // Add to linked children list
      const newChild: LinkedChild = {
        id: studentData.id,
        full_name: profileData.full_name || "Unknown",
        unique_id: profileData.unique_id,
        class_year: studentData.class_year || "Unknown",
      };

      setLinkedChildren([...linkedChildren, newChild]);
      setStudentCode("");

      toast({
        title: "Child Linked Successfully",
        description: `${newChild.full_name} has been added to your account.`,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Invalid Code",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: getSafeErrorMessage(error),
          variant: "destructive",
        });
      }
    } finally {
      setIsAddingChild(false);
    }
  };

  const handleRemoveChild = async (childId: string) => {
    try {
      const { error } = await supabase
        .from("students")
        .update({ parent_id: null })
        .eq("id", childId);

      if (error) throw error;

      setLinkedChildren(linkedChildren.filter(child => child.id !== childId));

      toast({
        title: "Child Removed",
        description: "Student has been unlinked from your account.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    }
  };

  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);

    try {
      if (!parentUserId) {
        toast({
          title: "Error",
          description: "User not found. Please sign in again.",
          variant: "destructive",
        });
        navigate("/auth?role=parent");
        return;
      }

      toast({
        title: "Welcome to Éclat!",
        description: "Your parent account has been set up successfully.",
      });

      navigate("/dashboard/parent");
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
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <BookOpen className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-foreground">Éclat</h1>
          </div>
          <p className="text-muted-foreground">Complete your parent profile</p>
        </div>

        <Card className="border-2 animate-scale-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Parent Profile Setup</CardTitle>
            <CardDescription className="text-center">
              Link your children's accounts using their student codes
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Child Section */}
            <div className="space-y-4">
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="studentCode">Student Code</Label>
                  <Input
                    id="studentCode"
                    type="text"
                    placeholder="Enter 8-character student code"
                    value={studentCode}
                    onChange={(e) => setStudentCode(e.target.value.toUpperCase())}
                    maxLength={8}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask your child for their unique student code from their dashboard
                  </p>
                </div>
                <div className="flex items-end">
                  <Button
                    type="button"
                    onClick={handleAddChild}
                    disabled={isAddingChild || studentCode.length !== 8}
                    className="gap-2"
                  >
                    {isAddingChild ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="h-4 w-4" />
                    )}
                    Add
                  </Button>
                </div>
              </div>
            </div>

            {/* Linked Children List */}
            {linkedChildren.length > 0 && (
              <div className="space-y-3">
                <Label className="flex items-center gap-2">
                  <UserCheck className="h-4 w-4" />
                  Linked Children ({linkedChildren.length})
                </Label>
                <div className="space-y-2">
                  {linkedChildren.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{child.full_name}</p>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" className="text-xs">
                            Code: {child.unique_id}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {child.class_year === "year_6" ? "Year 6" : "Year 9"}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveChild(child.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {linkedChildren.length === 0 && (
              <div className="bg-muted/50 p-6 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  No children linked yet. Add your first child using their student code above.
                </p>
              </div>
            )}

            {/* Info Box */}
            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <p className="text-sm">
                <strong>Note:</strong> You can add or remove children later from your dashboard. 
                Each student code can only be linked to one parent account.
              </p>
            </div>

            {/* Continue Button */}
            <Button
              type="button"
              onClick={handleCompleteOnboarding}
              disabled={isSubmitting}
              className="w-full"
              size="lg"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Setting up...
                </>
              ) : (
                "Continue to Dashboard"
              )}
            </Button>

            {linkedChildren.length === 0 && (
              <p className="text-xs text-center text-muted-foreground">
                You can skip this step and add children later
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
