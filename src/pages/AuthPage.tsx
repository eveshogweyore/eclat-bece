import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { getSafeErrorMessage } from "@/lib/errorUtils";

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(100),
});

export default function AuthPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "student";
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const getRoleTitle = () => {
    switch (role) {
      case "parent": return "Parent";
      case "school": return "School";
      default: return "Student";
    }
  };

  const getDashboardPath = () => {
    switch (role) {
      case "parent": return "/dashboard/parent";
      case "school": return "/dashboard/school";
      default: return "/dashboard/student";
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      // Validate input
      const validated = loginSchema.parse({ email, password });

      const { data, error } = await supabase.auth.signInWithPassword({
        email: validated.email,
        password: validated.password,
      });

      if (error) {
        toast({
          title: "Login Failed",
          description: getSafeErrorMessage(error),
          variant: "destructive",
        });
        return;
      }

      // Check if email is verified
      if (!data.user?.email_confirmed_at) {
        toast({
          title: "Email Not Verified",
          description: "Please verify your email before logging in.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        return;
      }

      // Check onboarding status for students
      if (role === "student") {
        const { data: studentData } = await supabase
          .from("students")
          .select("onboarding_completed")
          .eq("user_id", data.user.id)
          .single();

        if (studentData && !studentData.onboarding_completed) {
          navigate("/onboarding");
          return;
        }
      }

      navigate(getDashboardPath());
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
          description: error.errors[0].message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: "An unexpected error occurred",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const fullName = formData.get("fullName") as string;
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      // Validate input
      const validated = signupSchema.parse({ fullName, email, password });

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validated.fullName,
            role: role,
          },
        },
      });

      if (error) {
        toast({
          title: "Signup Failed",
          description: getSafeErrorMessage(error),
          variant: "destructive",
        });
        return;
      }

      if (!data.user) {
        toast({
          title: "Signup Failed",
          description: "Unable to create account",
          variant: "destructive",
        });
        return;
      }

      // Create role-specific record
      if (role === "student") {
        const { error: studentError } = await supabase
          .from("students")
          .insert({ user_id: data.user.id });

        if (studentError) {
          console.error("Error creating student record:", studentError);
        }

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "student" });

        if (roleError) {
          console.error("Error creating role:", roleError);
        }
      } else if (role === "parent") {
        const { error: parentError } = await supabase
          .from("parents")
          .insert({ user_id: data.user.id });

        if (parentError) {
          console.error("Error creating parent record:", parentError);
        }

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "parent" });

        if (roleError) {
          console.error("Error creating role:", roleError);
        }
      } else if (role === "school") {
        const schoolName = formData.get("schoolName") as string;
        
        const { error: schoolError } = await supabase
          .from("schools")
          .insert({ 
            user_id: data.user.id,
            school_name: schoolName 
          });

        if (schoolError) {
          console.error("Error creating school record:", schoolError);
        }

        const { error: roleError } = await supabase
          .from("user_roles")
          .insert({ user_id: data.user.id, role: "school" });

        if (roleError) {
          console.error("Error creating role:", roleError);
        }
      }

      // Send verification email
      const { error: emailError } = await supabase.functions.invoke(
        "send-verification-email",
        {
          body: { userId: data.user.id },
        }
      );

      if (emailError) {
        console.error("Error sending verification email:", emailError);
      }

      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });

      navigate("/verify-email");
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        toast({
          title: "Validation Error",
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
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8 animate-fade-in">
          <div className="inline-flex items-center gap-2 mb-2">
            <BookOpen className="text-primary" size={32} />
            <h1 className="text-3xl font-bold text-foreground">Éclat</h1>
          </div>
          <p className="text-muted-foreground">Empowering learning, one quiz at a time</p>
        </div>

        <Card className="border-2 animate-scale-in">
          <CardHeader>
            <CardTitle className="text-2xl text-center">Welcome, {getRoleTitle()}</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              {/* Login Form */}
              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      maxLength={255}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      maxLength={100}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </Button>
                  <p className="text-sm text-center text-muted-foreground">
                    Forgot your password?{" "}
                    <button 
                      type="button" 
                      onClick={() => navigate("/password-reset")}
                      className="text-primary hover:underline"
                    >
                      Reset here
                    </button>
                  </p>
                </form>
              </TabsContent>

              {/* Signup Form */}
              <TabsContent value="signup">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signup-name">Full Name</Label>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Ada Okafor"
                      required
                      minLength={2}
                      maxLength={100}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      required
                      maxLength={255}
                    />
                  </div>
                  {role === "school" && (
                    <div className="space-y-2">
                      <Label htmlFor="signup-school-name">School Name</Label>
                      <Input
                        id="signup-school-name"
                        name="schoolName"
                        type="text"
                        placeholder="Lagos International School"
                        required
                        maxLength={200}
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      name="password"
                      type="password"
                      placeholder="••••••••"
                      required
                      minLength={6}
                      maxLength={100}
                    />
                  </div>
                  <Button
                    type="submit"
                    variant="hero"
                    className="w-full"
                    disabled={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating account...
                      </>
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>

            <div className="mt-6 text-center">
              <Button variant="ghost" onClick={() => navigate("/role-selection")} className="text-sm">
                ← Back to Role Selection
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
