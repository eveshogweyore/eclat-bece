import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { BookOpen, Loader2, UserCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import { Badge } from "@/components/ui/badge";

interface LinkedChild {
  id: string;
  full_name: string;
  unique_id: string;
  class_year: string;
}

interface ChildRow {
  id: string;
  class_year: string | null;
  profiles: {
    full_name: string | null;
    unique_id: string;
  };
}

export default function ParentOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [linkedChildren, setLinkedChildren] = useState<LinkedChild[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [parentId, setParentId] = useState<string | null>(null);

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

        const { data: parentData, error: parentError } = await supabase
          .from("parents")
          .select("id")
          .eq("user_id", user.id)
          .single();

        if (parentError || !parentData) {
          throw parentError || new Error("Parent profile not found");
        }

        setParentId(parentData.id);

        const { data: children, error: childrenError } = await supabase
          .from("students")
          .select(`
            id,
            user_id,
            class_year,
            profiles!inner(full_name, unique_id)
          `)
          .eq("parent_id", parentData.id);

        if (childrenError) {
          console.error("Error fetching children:", childrenError);
        } else if (children && children.length > 0) {
          const formattedChildren = (children as unknown as ChildRow[]).map((child) => ({
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

  const handleCompleteOnboarding = async () => {
    setIsSubmitting(true);

    try {
      if (!parentId) {
        toast({
          title: "Error",
          description: "Parent profile not found. Please sign in again.",
          variant: "destructive",
        });
        navigate("/auth?role=parent");
        return;
      }

      toast({
        title: "Welcome to Eclat!",
        description: "Your parent account has been set up successfully.",
      });

      navigate("/dashboard/parent");
    } catch (error: unknown) {
      toast({
        title: "Setup Failed",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <BookOpen className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-foreground">Eclat</h1>
          </div>
          <p className="text-muted-foreground">Complete your parent profile</p>
        </div>

        <Card className="border-2 animate-scale-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Parent Profile Setup</CardTitle>
            <CardDescription className="text-center">
              Create and manage student accounts from your dashboard
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {linkedChildren.length > 0 ? (
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
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-muted/50 p-6 rounded-lg text-center">
                <p className="text-sm text-muted-foreground">
                  No student accounts have been created yet.
                </p>
              </div>
            )}

            <div className="bg-primary/10 p-4 rounded-lg border border-primary/20">
              <p className="text-sm">
                <strong>Note:</strong> Student accounts are created by parents from the dashboard.
                You can add your first child after completing setup.
              </p>
            </div>

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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
