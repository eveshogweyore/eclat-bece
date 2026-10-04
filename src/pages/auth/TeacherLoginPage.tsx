import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useRedirectIfAuthenticated } from "@/hooks/useRedirectIfAuthenticated";
import { z } from "zod";
import { getSafeErrorMessage } from "@/lib/errorUtils";
import { ThemeToggle } from "@/components/ThemeToggle";
import eclatlLogo from "@/assets/logo.png";

const loginSchema = z.object({
  email: z.string().trim().email("Invalid email address").max(255),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function TeacherLoginPage() {
  const navigate = useNavigate();
  useRedirectIfAuthenticated();
  const [isLoading, setIsLoading] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const { toast } = useToast();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const formData = new FormData(e.target as HTMLFormElement);
      const email = formData.get("email") as string;
      const password = formData.get("password") as string;

      if (!email || !password) {
        toast({
          title: "Input Required",
          description: "Please enter both email and password",
          variant: "destructive",
        });
        setIsLoading(false);
        return;
      }

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
        setIsLoading(false);
        return;
      }

      const userRole = data.user.user_metadata?.role as string | undefined;

      if (userRole && userRole !== "teacher") {
        toast({
          title: "Account Incompatible",
          description: "This login is for teacher accounts. Please use your designated portal.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      // Authoritative role check against user_roles
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", data.user.id)
        .maybeSingle();

      if (!roleData || roleData.role !== "teacher") {
        toast({
          title: "Role Not Found",
          description: "This account is not provisioned as a teacher. Contact your school administrator.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
        setIsLoading(false);
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Signed in to your teacher portal.",
      });
      navigate("/dashboard/teacher");
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
            Teacher Portal
          </p>
        </div>

        <section className="mt-8 w-full max-w-[360px] animate-scale-in border border-slate-300 bg-white px-6 pb-6 pt-5 shadow-[0_10px_28px_rgba(15,23,42,0.12)] dark:border-[#2a3a53] dark:bg-[#1b283d] dark:shadow-[0_10px_28px_rgba(0,0,0,0.22)]">
          <div className="mb-5 grid grid-cols-2 text-center text-[12px] font-bold tracking-[1px]">
            <button
              type="button"
              onClick={() => navigate("/auth/login/role-selection")}
              className="border-b border-slate-300 pb-3 text-slate-500 transition-colors hover:text-slate-900 dark:border-[#3a485c] dark:text-[#b6c0d1] dark:hover:text-white"
            >
              Login
            </button>
            <button
              type="button"
              className="border-b-2 border-sky-600 pb-3 text-sky-600 dark:border-[#72c8f6] dark:text-[#72c8f6]"
            >
              Teacher
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-3">
            <div className="space-y-2">
              <label htmlFor="teacher-email" className="block text-[11px] font-bold tracking-[1px] text-slate-700 dark:text-[#c5cee0]">
                Email
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8d9bb1]" size={15} />
                  <Input
                    id="teacher-email"
                    name="email"
                    type="email"
                    placeholder="you@yourschool.edu"
                    required
                    maxLength={255}
                    className="h-9 border-slate-300 bg-slate-50 pl-9 text-[12px] text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500 dark:border-[#2d3c55] dark:bg-[#111b30] dark:text-[#dce7ff] dark:placeholder:text-[#6f7b91] dark:focus-visible:ring-[#72c8f6]"
                  />
                </div>
              </label>
            </div>

            <div className="space-y-2">
              <label htmlFor="teacher-password" className="block text-[11px] font-bold tracking-[1px] text-slate-700 dark:text-[#c5cee0]">
                Password
                <div className="relative mt-2">
                  <LockKeyhole className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-[#8d9bb1]" size={15} />
                  <Input
                    id="teacher-password"
                    name="password"
                    type={showLoginPassword ? "text" : "password"}
                    placeholder="••••••••"
                    required
                    minLength={6}
                    maxLength={100}
                    className="h-9 border-slate-300 bg-slate-50 pl-9 pr-9 text-[12px] text-slate-900 placeholder:text-slate-400 focus-visible:ring-sky-500 dark:border-[#2d3c55] dark:bg-[#111b30] dark:text-[#dce7ff] dark:placeholder:text-[#6f7b91] dark:focus-visible:ring-[#72c8f6]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowLoginPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 transition-colors hover:text-slate-900 dark:text-[#718097] dark:hover:text-[#dce7ff]"
                  >
                    {showLoginPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </label>
            </div>

            <Button
              type="submit"
              className="flex h-9 w-full items-center justify-center gap-2 bg-sky-500 text-[12px] font-bold tracking-[1px] text-white transition-colors hover:bg-sky-600 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#72c8f6] dark:text-[#0a1a31] dark:hover:bg-[#8bd4fb]"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <span>Login to Teacher Portal</span>
                  <ArrowRight size={16} />
                </>
              )}
            </Button>

            <p className="pt-2 text-center text-[11px] text-muted-foreground">
              Teacher accounts are provisioned by your school. Contact your administrator if you need access.
            </p>
          </form>

          <div className="mt-6 text-center">
            <Button
              variant="ghost"
              onClick={() => navigate("/auth/login/role-selection")}
              className="mt-4 flex items-center gap-2 text-[11px] font-medium text-slate-600 transition-colors hover:bg-transparent hover:text-slate-900 dark:text-[#c1cada] dark:hover:bg-transparent dark:hover:text-white"
            >
              <ArrowLeft size={14} /> Back to Role Selection
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
