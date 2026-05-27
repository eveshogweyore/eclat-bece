import { useState, useEffect } from "react";
import { Link, useLocation, useNavigate, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
    LayoutDashboard,
    Users,
    BookOpen,
    BarChart3,
    Trophy,
    Settings,
    FileText,
    LogOut,
    Menu,
    X,
    Shield,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";

export const AdminLayout = () => {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const { user, loading: authLoading, signOut } = useAuth();

    const { data: isAuthorized, isLoading: isCheckingRole } = useQuery({
        queryKey: ["admin-auth", user?.id],
        queryFn: async () => {
            if (!user) return false;

            // Check if email is verified
            if (!user.email_confirmed_at) {
                navigate("/verify-email");
                return false;
            }

            // Check if user has admin role
            const { data: roleData } = await supabase
                .from("user_roles")
                .select("role")
                .eq("user_id", user.id)
                .eq("role", "admin" as any)
                .maybeSingle();

            if (!roleData) {
                // User doesn't have admin role - redirect to their appropriate dashboard
                const { data: userRole } = await supabase
                    .from("user_roles")
                    .select("role")
                    .eq("user_id", user.id)
                    .maybeSingle();

                if (userRole?.role === "student") {
                    navigate("/dashboard/student");
                } else if (userRole?.role === "parent") {
                    navigate("/dashboard/parent");
                } else if (userRole?.role === "school") {
                    navigate("/dashboard/school");
                } else {
                    navigate("/");
                }
                return false;
            }

            // Check admin record exists and is active
            const { data: adminData } = await supabase
                .from("admins" as any)
                .select("id, is_active")
                .eq("user_id", user.id)
                .maybeSingle() as any;

            if (!adminData || !adminData.is_active) {
                navigate("/");
                return false;
            }

            return true;
        },
        enabled: !!user,
        staleTime: 1000 * 60 * 5, // Cache for 5 minutes
    });

    useEffect(() => {
        if (!authLoading && !user) {
            navigate("/admin/login");
        }
    }, [authLoading, user, navigate]);

    const handleLogout = async () => {
        try {
            await signOut();
            toast.success("Logged out successfully");
        } catch (error) {
            console.error("Logout error:", error);
            toast.error("Failed to log out");
        }
    };

    const navigation = [
        { name: "Dashboard", href: "/admin", icon: LayoutDashboard },
        { name: "Admin Users", href: "/admin/users", icon: Shield },
        { name: "Question Bank", href: "/admin/questions", icon: BookOpen },
        { name: "Passages", href: "/admin/passages", icon: FileText },
        { name: "Platform Users", href: "/admin/platform-users", icon: Users },
        { name: "Analytics", href: "/admin/analytics", icon: BarChart3 },
        { name: "Competitions", href: "/admin/competitions", icon: Trophy },
        { name: "Reports", href: "/admin/reports", icon: FileText },
        { name: "Settings", href: "/admin/settings", icon: Settings },
    ];

    const isActiveRoute = (href: string) => {
        if (href === "/admin") {
            return location.pathname === href;
        }
        return location.pathname.startsWith(href);
    };

    if (authLoading || isCheckingRole) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!isAuthorized) {
        return null;
    }

    return (
        <div className="min-h-screen bg-background dashboard-theme">
            {/* Mobile Header */}
            <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b">
                <div className="flex items-center justify-between px-4 py-3">
                    <div className="flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary" />
                        <span className="font-bold text-lg">Éclat Admin</span>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                    >
                        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
                    </Button>
                </div>
            </div>

            {/* Sidebar */}
            <aside
                className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r transform transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"
                    }`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="hidden lg:flex items-center gap-2 px-6 py-6">
                        <Shield className="h-8 w-8 text-primary" />
                        <span className="font-bold text-xl">Éclat Admin</span>
                    </div>

                    <Separator className="hidden lg:block" />

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = isActiveRoute(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all ${active
                                        ? "bg-primary text-primary-foreground shadow-sm"
                                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                        }`}
                                >
                                    <Icon size={20} />
                                    <span className="font-medium">{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <Separator />

                    {/* Bottom Actions */}
                    <div className="p-4 space-y-2">
                        <div className="flex items-center justify-between px-2">
                            <span className="text-sm text-muted-foreground">Theme</span>
                            <ThemeToggle />
                        </div>
                        <Button
                            variant="outline"
                            className="w-full justify-start"
                            onClick={handleLogout}
                        >
                            <LogOut className="mr-2" size={18} />
                            Logout
                        </Button>
                    </div>
                </div>
            </aside>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-30 lg:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Main Content */}
            <main className="lg:pl-64 pt-16 lg:pt-0">
                <div className="p-6 lg:p-8">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};
