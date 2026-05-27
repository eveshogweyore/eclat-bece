import { ReactNode, useEffect, useState } from "react";
import { LayoutDashboard, Users, CreditCard, HelpCircle, Bell, Settings, LogOut, User as UserIcon, KeyRound, Copy, Check } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { Button } from "@/components/ui/button";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ParentSidebar } from "./ParentSidebar";
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

interface ParentLayoutProps {
    children: ReactNode;
}

export function ParentLayout({ children }: ParentLayoutProps) {
    const navigate = useNavigate();
    const location = useLocation();
    const { signOut, user } = useAuth();
    const { theme } = useTheme();
    const logo = theme === "dark" ? logoLight : logoDark;

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

    const navItems = [
        { title: "Dashboard", url: "/dashboard/parent", icon: LayoutDashboard },
        { title: "Children", url: "/dashboard/parent/children", icon: Users },
        { title: "Billing", url: "/dashboard/parent/subscriptions", icon: CreditCard },
        { title: "Resources", url: "/dashboard/parent/resources", icon: HelpCircle },
    ];

    const currentPath = location.pathname + location.hash;
    const isActive = (url: string) => currentPath === url;

    return (
        <SidebarProvider>
            <div className="min-h-screen flex w-full bg-gradient-to-br from-primary/5 via-background to-accent/5 dashboard-theme">
                <ParentSidebar />

                <div className="flex-1 flex flex-col relative">
                    {/* Desktop/Tablet Header */}
                    <header className="border-b border-border/40 bg-background/80 backdrop-blur-md sticky top-0 z-40 transition-all duration-300">
                        <div className="flex items-center justify-between px-4 sm:px-6 py-4">
                            <div className="flex items-center gap-4">
                                <SidebarTrigger className="md:hidden hover:scale-105 transition-transform" />
                                <img
                                    src={logo}
                                    alt="Éclat Logo"
                                    className="h-10 sm:h-12 w-auto cursor-pointer hover:opacity-80 transition-opacity"
                                    onClick={() => navigate("/")}
                                />
                            </div>

                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="hidden sm:flex items-center bg-muted/30 rounded-full px-3 py-1 border border-border/50">
                                    <span className="text-xs font-semibold text-muted-foreground mr-2">ROLE:</span>
                                    <span className="text-xs font-bold text-primary px-2 py-0.5 bg-primary/10 rounded-full">PARENT</span>
                                </div>
                                <NotificationBell />
                                <ThemeToggle />
                                
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="rounded-full hover:scale-105 transition-transform h-9 w-9 sm:h-10 sm:w-10 overflow-hidden p-0 border border-border/60"
                                        >
                                            <Avatar className="h-full w-full">
                                                <AvatarImage src={avatarUrl} alt={displayName} />
                                                <AvatarFallback className="bg-primary/5 text-primary font-bold text-sm">
                                                    {displayName ? displayName.substring(0, 2).toUpperCase() : <UserIcon className="h-4 w-4" />}
                                                </AvatarFallback>
                                            </Avatar>
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-64 rounded-2xl p-2 border-2 border-border/60 shadow-lg">
                                        <DropdownMenuLabel className="font-normal px-2.5 py-2">
                                            <div className="flex flex-col space-y-1">
                                                <p className="text-sm font-black text-foreground truncate">{displayName}</p>
                                                <p className="text-xs font-medium text-muted-foreground truncate">{email}</p>
                                                <span className="w-fit text-[9px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full uppercase mt-1">
                                                    Parent Account
                                                </span>
                                            </div>
                                        </DropdownMenuLabel>
                                        <DropdownMenuSeparator className="my-1.5" />
                                        <DropdownMenuItem onClick={() => navigate("/dashboard/parent/settings")} className="rounded-xl font-bold cursor-pointer py-2">
                                            <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Profile Settings</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => navigate("/dashboard/parent/settings?tab=security")} className="rounded-xl font-bold cursor-pointer py-2">
                                            <KeyRound className="mr-2 h-4 w-4 text-muted-foreground" />
                                            <span>Change Password</span>
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={handleCopyCode} className="rounded-xl font-bold cursor-pointer py-2">
                                            {copied ? (
                                                <Check className="mr-2 h-4 w-4 text-green-600 animate-pulse" />
                                            ) : (
                                                <Copy className="mr-2 h-4 w-4 text-muted-foreground" />
                                            )}
                                            <div className="flex justify-between w-full items-center">
                                                <span>Copy Link Code</span>
                                                <span className="font-mono text-[10px] bg-muted px-1.5 py-0.5 rounded font-black text-primary select-all">{uniqueId}</span>
                                            </div>
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator className="my-1.5" />
                                        <DropdownMenuItem onClick={signOut} className="rounded-xl font-bold cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive py-2">
                                            <LogOut className="mr-2 h-4 w-4" />
                                            <span>Sign Out</span>
                                        </DropdownMenuItem>
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </div>
                    </header>

                    {/* Main Content Area */}
                    <main className="flex-1 pb-24 md:pb-8">
                        <div className="container mx-auto">
                            {children}
                        </div>
                    </main>

                    {/* Mobile Bottom Navigation */}
                    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-background/95 backdrop-blur-lg border-t border-border/60 px-2 py-3 z-50 shadow-[0_-8px_20px_-8px_rgba(0,0,0,0.1)]">
                        <div className="flex justify-around items-center max-w-md mx-auto">
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
                                        className={`flex flex-col items-center gap-1 transition-all duration-300 relative px-4 py-1 rounded-2xl ${active ? "text-primary scale-110" : "text-muted-foreground hover:text-primary/70"
                                            }`}
                                    >
                                        <Icon className={`h-6 w-6 ${active ? "fill-primary/10 stroke-[2.5px]" : "stroke-[2px]"}`} />
                                        <span className={`text-[10px] font-bold uppercase tracking-tight ${active ? "opacity-100" : "opacity-60"}`}>
                                            {item.title}
                                        </span>
                                        {active && (
                                            <span className="absolute -top-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary shadow-[0_0_8px_rgba(var(--primary),0.5)] animate-pulse" />
                                        )}
                                    </button>
                                );
                            })}
                            <button
                                onClick={signOut}
                                className="flex flex-col items-center gap-1 text-muted-foreground hover:text-destructive opacity-80"
                            >
                                <LogOut className="h-6 w-6 stroke-[2px]" />
                                <span className="text-[10px] font-bold uppercase tracking-tight opacity-60">Exit</span>
                            </button>
                        </div>
                    </nav>
                </div>
            </div>
        </SidebarProvider>
    );
}
