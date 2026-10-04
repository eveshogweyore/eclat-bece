import { useNavigate } from "react-router-dom";
import { ArrowRight, ArrowLeft, Building2, GraduationCap, Users, ClipboardCheck } from "lucide-react";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@/components/ThemeToggle";
import eclatlLogo from "@/assets/logo.png";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { useRedirectIfAuthenticated } from "@/hooks/useRedirectIfAuthenticated";

export default function SignUpRoleSelectionPage({ login = false }: { login?: boolean }) {
  const navigate = useNavigate();
  useRedirectIfAuthenticated();

  const roles = login
    ? [
      {
        id: "student",
        icon: GraduationCap,
        title: "Student",
        description: "Log in to your account and continue your learning journey.",
      },
      {
        id: "parent",
        icon: Users,
        title: "Parent",
        description: "Monitor academic performance, manage child accounts, and review progress.",
      },
      {
        id: "school",
        icon: Building2,
        title: "School",
        description: "Access school tools to manage students, classes, and analytics.",
      },
      {
        id: "teacher",
        icon: ClipboardCheck,
        title: "Teacher",
        description: "Log in to assign practice tasks and track your allocated classes.",
      },
    ]
    : [
      {
        id: "parent",
        icon: Users,
        title: "Parent",
        description: "Create a parent profile and manage your child’s account, performance, and assignments.",
      },
      {
        id: "school",
        icon: Building2,
        title: "School",
        description: "Create a school profile and manage student onboarding, classes, and performance reporting.",
      },
    ];

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#081328] p-0 font-sans text-[#dce7ff] relative">
      <div className="absolute right-4 top-4 z-50">
        <ThemeToggle className="text-slate-200 hover:text-white" />
      </div>
      <section className="relative flex min-h-screen w-full flex-col overflow-hidden bg-[#081328]">
        <div className="flex flex-1 flex-col items-center px-6 pb-10 pt-14 sm:px-12 sm:pt-20 lg:px-[92px] lg:pt-[82px]">
          <div className="animate-fade-in text-center">
            <img src={eclatlLogo} alt="Eclat Logo" className="h-20 w-auto mx-auto mb-6" />
            <h2 className="mt-6 text-[32px] font-bold leading-none text-[#dce3fa]">Select Your Role</h2>
            <p className="mx-auto mt-3 max-w-[430px] text-[16px] leading-[1.45] text-[#bbc5d9]">
              {login ? "Choose your role to sign in to your portal." : "Choose your account type to get started."}
            </p>
          </div>

          <div className={`mt-[84px] grid w-full gap-4 sm:gap-6 ${login ? "max-w-[905px] grid-cols-1 sm:grid-cols-3" : "max-w-[620px] grid-cols-1 sm:grid-cols-2"}`}>
            {roles.map(({ id, icon: Icon, title, description }, index) => (
              <button
                key={id}
                type="button"
                className="group flex min-h-[290px] flex-col items-start border border-[#1d2c47] bg-[#121e34] px-7 py-7 text-left transition duration-200 hover:-translate-y-1 hover:border-[#43718e] hover:bg-[#172640] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#72c8f6] animate-scale-in"
                style={{ animationDelay: `${index * 100}ms` }}
                onClick={() =>
                  navigate(
                    login
                      ? `/${id === "student" ? "student-login" : `${id}-login`}`
                      : id === "parent"
                        ? "/parent-signup"
                        : `/auth?role=${id}`
                  )
                }
              >
                <span className="flex h-[57px] w-[57px] items-center justify-center rounded-[11px] bg-[#1c2b45] text-[#72c8f6] transition-transform group-hover:scale-105">
                  <Icon size={31} strokeWidth={2.2} />
                </span>
                <span className="mt-7 text-[20px] font-bold text-[#dce3fa]">{title}</span>
                <span className="mt-3 text-[15px] leading-[1.45] text-[#bdc8db]">{description}</span>
                <span className="mt-auto flex items-center gap-3 pt-6 text-[13px] font-bold uppercase tracking-[1px] text-[#65b9e5]">
                  Click to continue <ArrowRight size={18} strokeWidth={2.5} />
                </span>
              </button>
            ))}
          </div>

          {!login && (
            <p className="mt-8 text-center text-[14px] text-[#bbc5d9]">
              Are you a student? Student accounts are managed by parents and schools.{" "}
              <button
                type="button"
                onClick={() => navigate("/student-login")}
                className="font-semibold text-[#72c8f6] hover:underline"
              >
                Sign in here &rarr;
              </button>
            </p>
          )}

          <button
            type="button"
            onClick={() => navigate("/")}
            className="mt-auto flex items-center gap-3 pt-14 text-[14px] font-medium text-[#c4cede] transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-[#72c8f6]"
          >
            <ArrowLeft size={18} /> Back to Home
          </button>
        </div>
      </section>
    </main>
  );
}
