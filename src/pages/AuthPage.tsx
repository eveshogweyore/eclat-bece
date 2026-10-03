import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, ArrowRight, BookOpen, Eye, EyeOff, Loader2, School, User } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import { ThemeToggle } from "@/components/ThemeToggle";
import eclatlLogo from "@/assets/logo.png";
import { useRedirectIfAuthenticated } from "@/hooks/useRedirectIfAuthenticated";
import type { AuthRole } from "@/components/auth/AuthLayout";

const signupSchema = z
  .object({
    fullName: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().trim().email("Invalid email address").max(255),
    password: z.string().min(6, "Password must be at least 6 characters").max(100),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export default function AuthPage({ roleOverride }: { roleOverride?: AuthRole }) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "parent";
  const [isLoading, setIsLoading] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { toast } = useToast();

  const getRoleTitle = () => {
    switch (role) {
      case "parent":
        return "Parent";
      case "school":
        return "School";
      default:
        return "Student";
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
      const confirmPassword = formData.get("confirmPassword") as string;
      const schoolName = role === "school" ? ((formData.get("schoolName") as string) || "").trim() : undefined;

      const validated = signupSchema.parse({ fullName, email, password, confirmPassword });

      if (role === "school" && (!schoolName || schoolName.length < 2)) {
        toast({
          title: "Validation Error",
          description: "School name must be at least 2 characters",
          variant: "destructive",
        });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: validated.email,
        password: validated.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            full_name: validated.fullName,
            role,
            ...(role === "school" ? { school_name: schoolName } : {}),
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

      // With Supabase's "Confirm email" toggle off, signUp returns an active
      // session. The intended flow is "verify the emailed code, then sign in",
      // so drop the session now — otherwise the login page would immediately
      // bounce the unverified user back to the dashboard.
      if (data.session) {
        await supabase.auth.signOut();
      }

      if (data.user.identities && data.user.identities.length === 0) {
        toast({
          title: "Account Already Exists",
          description: "An account with this email already exists. Please sign in instead.",
          variant: "destructive",
        });
        navigate(role === "parent" ? "/parent-login" : role === "school" ? "/school-login" : "/auth/login/role-selection");
        return;
      }

      const { error: emailError } = await supabase.functions.invoke("send-verification-email", {
        body: { user_id: data.user.id },
      });

      if (emailError) {
        console.error("Error sending verification email:", emailError);
      }

      toast({
        title: "Account Created!",
        description: "Please check your email to verify your account.",
      });

      // Navigate to email verification page with user_id for later onboarding redirect
      navigate(`/verify-email?email=${encodeURIComponent(validated.email)}&role=${role}&user_id=${data.user.id}`);
    } catch (error: unknown) {
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

  const handleGoogleLogin = async () => {
    try {
      setIsLoading(true);
      localStorage.setItem("pendingRole", role);

      // The school name is NOT required for the Gmail path — the onboarding
      // step collects it (required) before dashboard access. If the admin
      // happened to fill the field in, pass it along so the school row is
      // provisioned with it; otherwise clear any stale value.
      if (role === "school") {
        const schoolInput = document.getElementById("signup-school-name") as HTMLInputElement | null;
        const schoolName = schoolInput?.value?.trim() || "";
        if (schoolName) {
          localStorage.setItem("pendingSchoolName", schoolName);
        } else {
          localStorage.removeItem("pendingSchoolName");
        }
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Carry the role in the URL so the callback does not depend on
          // localStorage surviving the redirect.
          redirectTo: `${window.location.origin}/auth/callback?role=${role}`,
        },
      });

      if (error) {
        toast({
          title: "Google Sign-In Failed",
          description: getSafeErrorMessage(error),
          variant: "destructive",
        });
      }
    } catch (error: unknown) {
      toast({
        title: "Error",
        description: getSafeErrorMessage(error),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };



  return (
    <main className="relative flex min-h-screen items-center justify-center bg-slate-100 px-4 py-8 font-sans text-slate-900 dark:bg-[#081328] dark:text-[#dce7ff]">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>

      <div className="flex w-full max-w-[420px] flex-col items-center">
        <div className="animate-fade-in text-center">
          <img src={eclatlLogo} alt="Eclat Logo" className="mx-auto mb-2 h-16 w-auto" />
          <p className="mt-2 text-[11px] font-bold uppercase tracking-[2px] text-slate-600 dark:text-[#b9c5d9]">
            {getRoleTitle()} Portal
          </p>
        </div>

        <section className="mt-8 w-full max-w-[360px] animate-scale-in border border-slate-300 bg-white px-6 pb-6 pt-5 shadow-[0_10px_28px_rgba(15,23,42,0.12)] dark:border-[#2a3a53] dark:bg-[#1b283d] dark:shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
          <div className="mb-5 grid grid-cols-2 text-center text-[12px] font-bold tracking-[1px]">
            <button
              type="button"
              onClick={() => navigate(role === "school" ? "/school-login" : "/parent-login")}
              className="border-b border-slate-300 pb-3 text-slate-500 transition-colors hover:text-slate-900 dark:border-[#3a485c] dark:text-[#b6c0d1] dark:hover:text-white"
            >
              Login
            </button>
            <button
              type="button"
              className="border-b-2 border-sky-600 pb-3 text-sky-600 dark:border-[#72c8f6] dark:text-[#72c8f6]"
            >
              Sign Up
            </button>
          </div>

          <div className="p-0">
            {role === "student" ? (
              <div className="space-y-4 py-8 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                  <BookOpen className="text-primary" size={32} />
                </div>
                <h3 className="text-xl font-semibold">Registration Required</h3>
                <p className="px-4 text-muted-foreground">
                  Student accounts are created by parents. Please ask your parent to create an account for you from their dashboard.
                </p>
                <Button variant="outline" onClick={() => navigate("/auth?role=student")} className="mt-4">
                  Return to Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="signup-name" className="text-[11px] font-bold tracking-[1px] text-slate-700 dark:text-[#c5cee0]">
                    {role === "school" ? "Administrator Full Name" : "Full Name"}
                  </Label>
                  <div className="relative">
                    <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                      <User size={19} />
                    </div>
                    <Input
                      id="signup-name"
                      name="fullName"
                      type="text"
                      placeholder="Jane Doe"
                      required
                      minLength={2}
                      maxLength={100}
                      className="h-9 border-slate-300 bg-slate-50 pl-10 text-[12px] text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500 dark:border-[#2d3c55] dark:bg-[#111b30] dark:text-[#dce7ff] dark:placeholder:text-[#6f7b91] dark:focus-visible:ring-[#72c8f6]"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-[11px] font-bold tracking-[1px] text-slate-700 dark:text-[#c5cee0]">
                    Email
                  </Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                    maxLength={255}
                    className="h-9 border-slate-300 bg-slate-50 text-[12px] text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500 dark:border-[#2d3c55] dark:bg-[#111b30] dark:text-[#dce7ff] dark:placeholder:text-[#6f7b91] dark:focus-visible:ring-[#72c8f6]"
                  />
                </div>

                {role === "school" && (
                  <div className="space-y-2">
                    <Label htmlFor="signup-school-name" className="text-[11px] font-bold tracking-[1px] text-slate-700 dark:text-[#c5cee0]">
                      School Name
                    </Label>
                    <div className="relative">
                      <div className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                        <School size={19} />
                      </div>
                      <Input
                        id="signup-school-name"
                        name="schoolName"
                        type="text"
                        placeholder="Lagos International School"
                        required
                        maxLength={150}
                        className="h-9 border-slate-300 bg-slate-50 pl-10 text-[12px] text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500 dark:border-[#2d3c55] dark:bg-[#111b30] dark:text-[#dce7ff] dark:placeholder:text-[#6f7b91] dark:focus-visible:ring-[#72c8f6]"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="signup-password" className="text-[11px] font-bold tracking-[1px] text-slate-700 dark:text-[#c5cee0]">
                    Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      maxLength={100}
                      className="h-9 border-slate-300 bg-slate-50 pr-10 text-[12px] text-slate-900 focus-visible:ring-sky-500 dark:border-[#2d3c55] dark:bg-[#111b30] dark:text-[#dce7ff] dark:focus-visible:ring-[#72c8f6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-900 dark:text-[#718097] dark:hover:text-[#dce7ff]"
                    >
                      {showSignupPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password" className="text-[11px] font-bold tracking-[1px] text-slate-700 dark:text-[#c5cee0]">
                    Confirm Password
                  </Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      name="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      required
                      minLength={6}
                      maxLength={100}
                      className="h-9 border-slate-300 bg-slate-50 pr-10 text-[12px] text-slate-900 focus-visible:ring-sky-500 dark:border-[#2d3c55] dark:bg-[#111b30] dark:text-[#dce7ff] dark:focus-visible:ring-[#72c8f6]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-900 dark:text-[#718097] dark:hover:text-[#dce7ff]"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <Button
                  type="submit"
                  variant="hero"
                  className="flex h-9 w-full items-center justify-center gap-2 bg-sky-500 text-[12px] font-bold tracking-[1px] text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#72c8f6] dark:text-[#0a1a31] dark:hover:bg-[#8bd4fb]"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating account...
                    </>
                  ) : (
                    <>
                      <span>Create Account</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={handleGoogleLogin}
                  disabled={isLoading}
                  className="mt-3 flex h-9 w-full items-center justify-center gap-2 border border-slate-300 bg-slate-50 text-[12px] font-bold tracking-[1px] text-slate-700 transition-colors hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-60 dark:border-[#2a3a53] dark:bg-[#111b30] dark:text-[#dce7ff] dark:hover:bg-[#1a2a42]"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="#4285F4" d="M21.35 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.24a4.48 4.48 0 0 1-1.94 2.94v2.43h3.14c1.84-1.69 2.91-4.18 2.91-7.2Z" />
                    <path fill="#34A853" d="M12 21.5c2.63 0 4.84-.87 6.45-2.35l-3.14-2.43c-.87.58-1.98.93-3.31.93-2.55 0-4.71-1.72-5.49-4.04H3.27v2.51A9.74 9.74 0 0 0 12 21.5Z" />
                    <path fill="#FBBC05" d="M6.51 13.61a5.86 5.86 0 0 1 0-3.72V7.38H3.27a9.73 9.73 0 0 0 0 8.74l3.24-2.51Z" />
                    <path fill="#EA4335" d="M12 5.85c1.43 0 2.71.49 3.72 1.46l2.79-2.79C16.84 2.93 14.63 2 12 2a9.74 9.74 0 0 0-8.73 5.38l3.24 2.51C7.29 7.57 9.45 5.85 12 5.85Z" />
                  </svg>
                  Sign Up with Gmail
                </button>
              </form>
            )}
          </div>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/auth/signup/role-selection")}
              className="mt-7 flex items-center gap-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-transparent hover:text-slate-900 dark:text-[#c1cada] dark:hover:bg-transparent dark:hover:text-white"
            >
              <ArrowLeft size={14} /> Back to Role Selection
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
