import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { Bell, Settings, LogOut, User as UserIcon, KeyRound, Copy, Check, HelpCircle } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { ContentLoader } from "@/components/PageLoader";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ParentSidebar } from "./ParentSidebar";
import { parentNavItems } from "./parentNav";
import { useTheme } from "next-themes";
import logoDark from "@/assets/logo-dark.png";
import logoLight from "@/assets/logo-light.png";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * Persistent parent portal shell — mounted once as the /dashboard/parent
 * layout route element. Child pages render through the Outlet inside a local
 * Suspense boundary so lazy page chunks never blank the sidebar or header.
 */
export function ParentLayout() {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut, user } = useAuth();
    const { resolvedTheme } = useTheme();
    const isDark = resolvedTheme === "dark";
    const logo = isDark ? logoLight : logoDark;

    const [displayName, setDisplayName] = useState("");
    const [email, setEmail] = useState("");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [uniqueId, setUniqueId] = useState("");
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        const fetchParentProfile = async () => {
            if (!user) return;
            try {
                const { data, error } = await supabase
                    .from("profiles")
                    .select("display_name, full_name, email, avatar_url, unique_id")
                    .eq("id", user.id)
                    .single();

                if (error) throw error;
                if (data) {
                    setDisplayName(data.full_name || data.display_name || data.email || "Parent");
                    setEmail(data.email || "");
                    setAvatarUrl(data.avatar_url || "");
                    setUniqueId(data.unique_id || "");
                }
            } catch (err) {
                console.error("Error fetching parent profile in layout:", err);
            }
        };

        fetchParentProfile();
    }, [user]);

    useEffect(() => {
        const handleProfileUpdate = (event: Event) => {
            const customEvent = event as CustomEvent;
            if (customEvent.detail) {
                if (customEvent.detail.avatar_url !== undefined) {
                    setAvatarUrl(customEvent.detail.avatar_url);
                }
                if (customEvent.detail.full_name !== undefined) {
                    setDisplayName(customEvent.detail.full_name);
                }
            }
        };

        window.addEventListener("profile-updated", handleProfileUpdate);
        return () => {
            window.removeEventListener("profile-updated", handleProfileUpdate);
        };
    }, []);

    const handleCopyCode = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (uniqueId) {
            navigator.clipboard.writeText(uniqueId);
            setCopied(true);
            toast.success("Connection code copied!");
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Mobile bottom nav mirrors the shared nav list (first five entries); the
    // sidebar renders all of them.
    const navItems = parentNavItems.slice(0, 5).map((item) => ({ ...item }));

    const currentPath = location.pathname + location.hash;
    const isActive = (url: string) => currentPath === url;

    return (
        <SidebarProvider>
            <div className="parent-shell min-h-screen flex w-full dashboard-theme bg-background text-foreground">
                <div className="print:hidden">
                    <ParentSidebar />
                </div>

                <div className="flex-1 flex flex-col relative print:p-0 print:m-0">
                    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl print:hidden">
                        <div className="flex items-center justify-between px-4 py-4 sm:px-6">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="md:hidden text-foreground/70 hover:text-foreground hover:bg-accent transition-colors" />
                                <img
                                    src={logo}
                                    alt="Éclat Logo"
                                    className="h-8 w-auto cursor-pointer opacity-90 transition hover:opacity-100"
                                    onClick={() => navigate("/")}
                                />
                            </div>

                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="hidden items-center rounded-full border border-border bg-card/80 px-3 py-1.5 shadow-sm sm:flex">
                                    <span className="mr-2 text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">Role</span>
                                    <span className="rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[10px] font-black uppercase tracking-[0.18em] text-primary">Parent</span>
                                </div>
                                <NotificationBell />
                                <ThemeToggle />

                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-9 w-9 overflow-hidden rounded-full border border-border p-0 transition hover:border-primary/50 sm:h-10 sm:w-10"
                                        >
                                            <Avatar className="h-full w-full">
                                                <AvatarImage src={avatarUrl} alt={displayName} />
                                                <AvatarFallback className="bg-muted text-sm font-bold text-foreground">
                                                    {displayName ? displayName.substring(0, 2).toUpperCase() : <UserIcon className="h-4 w-4" />}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 rounded-2xl border border-border bg-popover p-2 text-popover-foreground shadow-2xl">
                                        <DropdownMenuLabel className="px-2.5 py-2 font-normal">
                                            <div className="flex flex-col space-y-1">
                                                <p className="truncate text-sm font-black text-foreground">{displayName}</p>
                                                <p className="truncate text-xs font-medium text-muted-foreground">{email}</p>
                                                <span className="mt-1 w-fit rounded-full bg-primary/10 border border-primary/20 px-2 py-0.5 text-[9px] font-bold uppercase tracking-[0.18em] text-primary">
                                                    Parent Account
                                                </span>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="my-1.5" />
                                        <DropdownMenuItem onClick={() => navigate("/dashboard/parent/settings")} className="cursor-pointer rounded-xl py-2 font-bold text-foreground hover:bg-accent hover:text-accent-foreground">
                                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Profile Settings</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate("/dashboard/parent/settings?tab=security")} className="cursor-pointer rounded-xl py-2 font-bold text-foreground hover:bg-accent hover:text-accent-foreground">
                                            <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Change Password</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleCopyCode} className="cursor-pointer rounded-xl py-2 font-bold text-foreground hover:bg-accent hover:text-accent-foreground">
                                            {copied ? (
                                                <Check className="mr-2 h-4 w-4 text-emerald-500" />
                                            ) : (
                                                <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                                            )}
                                            <div className="flex w-full items-center justify-between">
                                                <span>Copy Link Code</span>
                                                <span className="select-all rounded border border-border bg-muted px-1.5 py-0.5 font-mono text-[10px] font-black text-primary">{uniqueId}</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate("/dashboard/parent/resources")} className="cursor-pointer rounded-xl py-2 font-bold text-foreground hover:bg-accent hover:text-accent-foreground">
                                            <HelpCircle className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Help & Resources</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1.5" />
                                        <DropdownMenuItem onClick={() => signOut()} className="cursor-pointer rounded-xl py-2 font-bold text-destructive focus:bg-destructive/10 focus:text-destructive">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Sign Out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    <main className="flex-1 pb-24 md:pb-8 print:p-0 print:pb-0">
                        <div className="parent-page-shell print:p-0 print:m-0 print:max-w-none">
                            <Suspense fallback={<ContentLoader />}>
                                <Outlet />
                            </Suspense>
                        </div>
                    </main>

                    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/80 bg-background/95 px-2 py-3 backdrop-blur-xl shadow-[0_-10px_30px_rgba(0,0,0,0.08)] md:hidden print:hidden">
                        <div className="mx-auto flex max-w-md items-center justify-around">
                            {navItems.map((item) => {
                                const Icon = item.icon;
                                const active = isActive(item.url);
                                return (
                                    <button
                                        key={item.title}
                                        onClick={() => {
                                            if (item.url.includes("#") && currentPath === item.url.split("#")[0]) {
                                                const el = document.getElementById(item.url.split("#")[1]);
                                                if (el) el.scrollIntoView({ behavior: 'smooth' });
                                            } else {
                                                navigate(item.url);
                                            }
                                        }}
                                        className={`relative flex flex-col items-center gap-1 rounded-2xl px-4 py-1 transition-all duration-300 ${active ? 'scale-105 text-primary font-bold' : 'text-muted-foreground hover:text-foreground'}`}
                                    >
                                        <Icon className={`h-6 w-6 ${active ? 'stroke-[2.5px]' : 'stroke-[2px]'}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-tight ${active ? 'opacity-100' : 'opacity-70'}`}>
                                            {item.title}
                                        </span>
                                        {active && <span className="absolute -top-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary))]" />}
                                    </button>
                                );
                            })}
                            <button
                                onClick={() => signOut()}
                                className="flex flex-col items-center gap-1 text-muted-foreground opacity-80 hover:text-destructive transition-colors"
                            >
                                <LogOut className="h-6 w-6 stroke-[2px]" />
                                <span className="text-[10px] font-bold uppercase tracking-tight opacity-70">Exit</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </div>
        </SidebarProvider>
    );
}
