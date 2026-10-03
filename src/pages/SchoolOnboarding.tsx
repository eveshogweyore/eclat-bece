import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getSafeErrorMessage } from "@/lib/errorUtils";

/**
 * Post-signup profile step for schools (currently only the Gmail/OAuth path —
 * the password path collects everything in the signup form). Persists the
 * school name plus optional address / contact email to the schools row.
 */
export default function SchoolOnboarding() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isLoadingSchool, setIsLoadingSchool] = useState(true);
  const [schoolName, setSchoolName] = useState("");
  const [address, setAddress] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadSchool = async () => {
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

        // Gmail signups may arrive with an unnamed school row; prefill whatever
        // exists so this step doubles as the place to set the name.
        const { data: school, error } = await supabase
          .from("schools")
          .select("school_name, address, contact_email")
          .eq("user_id", user.id)
          .maybeSingle();

        if (error) throw error;
        if (cancelled) return;

        setSchoolName(school?.school_name || "");
        setAddress(school?.address || "");
        setContactEmail(school?.contact_email || "");
      } catch (error: unknown) {
        if (!cancelled) {
          console.error("Error loading school profile:", error);
          toast({
            title: "Error",
            description: getSafeErrorMessage(error),
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoadingSchool(false);
      }
    };

    loadSchool();
    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanName = schoolName.trim();
    if (cleanName.length < 2) {
      toast({
        title: "Validation Error",
        description: "School name must be at least 2 characters",
        variant: "destructive",
      });
      return;
    }

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

      const { error: updateError } = await supabase
        .from("schools")
        .update({
          school_name: cleanName,
          address: address.trim() || null,
          contact_email: contactEmail.trim() || null,
        })
        .eq("user_id", user.id);

      if (updateError) throw updateError;

      toast({
        title: "Welcome to Éclat!",
        description: "Your school account has been set up successfully.",
      });

      navigate("/dashboard/school");
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
            <CardTitle className="text-2xl text-center">School Profile Setup</CardTitle>
            <CardDescription className="text-center">
              Confirm your school's details to finish setting up your account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLoadingSchool ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="school-name">School Name</Label>
                  <Input
                    id="school-name"
                    type="text"
                    placeholder="Lagos International School"
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    required
                    minLength={2}
                    maxLength={150}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">School Address (Optional)</Label>
                  <Input
                    id="address"
                    type="text"
                    placeholder="123 Education Street, Lagos"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    maxLength={200}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contact-email">Contact Email (Optional)</Label>
                  <Input
                    id="contact-email"
                    type="email"
                    placeholder="admin@school.edu"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    maxLength={255}
                  />
                  <p className="text-xs text-muted-foreground">
                    Alternative email for school communications
                  </p>
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground">
                    <strong>Your School Code:</strong> You'll find your unique school code on your dashboard.
                    Share it with students to allow them to join your school.
                  </p>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="w-full"
                  disabled={isSubmitting}
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
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
