import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Trophy, TrendingUp, Activity, Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { formatDistanceToNow } from "date-fns";

interface PlatformStats {
    totalStudents: number;
    totalParents: number;
    totalSchools: number;
    totalQuestions: number;
    totalQuizzesTaken: number;
    activeStudentsToday: number;
}

interface RecentActivity {
    id: string;
    action: string;
    resource_type: string;
    details: any;
    created_at: string;
    admin: {
        full_name: string;
    } | null;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const [adminName, setAdminName] = useState("Admin");
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [stats, setStats] = useState<PlatformStats>({
        totalStudents: 0,
        totalParents: 0,
        totalSchools: 0,
        totalQuestions: 0,
        totalQuizzesTaken: 0,
        activeStudentsToday: 0,
    });
    const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchAdminData();
        fetchPlatformStats();
        fetchRecentActivity();
    }, [user]);

    const fetchAdminData = async () => {
        if (!user) return;

        const { data } = await supabase
            .from("admins")
            .select("full_name, is_super_admin")
            .eq("user_id", user.id)
            .single();

        if (data) {
            setAdminName(data.full_name || "Admin");
            setIsSuperAdmin(data.is_super_admin || false);
        }
    };

    const fetchPlatformStats = async () => {
        try {
            // Count students
            const { count: studentCount } = await supabase
                .from("students")
                .select("*", { count: "exact", head: true });

            // Count parents
            const { count: parentCount } = await supabase
                .from("parents")
                .select("*", { count: "exact", head: true });

            // Count schools
            const { count: schoolCount } = await supabase
                .from("schools")
                .select("*", { count: "exact", head: true });

            // Count quiz questions (Year 6 + Year 9)
            const { count: year6Questions } = await supabase
                .from("quiz_questions_year6")
                .select("*", { count: "exact", head: true });

            const { count: year9Questions } = await supabase
                .from("quiz_questions_year9")
                .select("*", { count: "exact", head: true });

            // Count total quizzes taken
            const { count: quizzesTaken } = await supabase
                .from("quiz_results")
                .select("*", { count: "exact", head: true });

            // Count active students today
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const { count: activeToday } = await supabase
                .from("quiz_results")
                .select("student_id", { count: "exact", head: true })
                .gte("completed_at", today.toISOString());

            setStats({
                totalStudents: studentCount || 0,
                totalParents: parentCount || 0,
                totalSchools: schoolCount || 0,
                totalQuestions: (year6Questions || 0) + (year9Questions || 0),
                totalQuizzesTaken: quizzesTaken || 0,
                activeStudentsToday: activeToday || 0,
            });
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            const { data } = await supabase
                .from("admin_audit_log")
                .select(`
          id,
          action,
          resource_type,
          details,
          created_at,
          admin:admins(full_name)
        `)
                .order("created_at", { ascending: false })
                .limit(10);

            if (data) {
                setRecentActivity(data as RecentActivity[]);
            }
        } catch (error) {
            console.error("Error fetching recent activity:", error);
        }
    };

    const statCards = [
        {
            title: "Total Students",
            value: stats.totalStudents.toLocaleString(),
            icon: Users,
            color: "text-blue-600",
            bgColor: "bg-blue-100 dark:bg-blue-900/30",
            description: "Registered students",
        },
        {
            title: "Total Questions",
            value: stats.totalQuestions.toLocaleString(),
            icon: BookOpen,
            color: "text-green-600",
            bgColor: "bg-green-100 dark:bg-green-900/30",
            description: "In question bank",
        },
        {
            title: "Quizzes Taken",
            value: stats.totalQuizzesTaken.toLocaleString(),
            icon: Trophy,
            color: "text-yellow-600",
            bgColor: "bg-yellow-100 dark:bg-yellow-900/30",
            description: "Total completions",
        },
        {
            title: "Active Today",
            value: stats.activeStudentsToday.toLocaleString(),
            icon: Activity,
            color: "text-purple-600",
            bgColor: "bg-purple-100 dark:bg-purple-900/30",
            description: "Students practicing",
        },
        {
            title: "Total Parents",
            value: stats.totalParents.toLocaleString(),
            icon: Users,
            color: "text-orange-600",
            bgColor: "bg-orange-100 dark:bg-orange-900/30",
            description: "Registered parents",
        },
        {
            title: "Total Schools",
            value: stats.totalSchools.toLocaleString(),
            icon: TrendingUp,
            color: "text-pink-600",
            bgColor: "bg-pink-100 dark:bg-pink-900/30",
            description: "Partner schools",
        },
    ];

    const getActionDescription = (activity: RecentActivity) => {
        const adminName = activity.admin?.full_name || "Unknown Admin";
        return `${adminName} ${activity.action.replace(/_/g, " ")} a ${activity.resource_type}`;
    };

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="animate-fade-in">
                <div className="flex items-center gap-2 mb-2">
                    <h1 className="text-3xl font-bold text-foreground">Welcome back, {adminName}!</h1>
                    {isSuperAdmin && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-semibold">
                            <Shield size={14} />
                            Super Admin
                        </div>
                    )}
                </div>
                <p className="text-muted-foreground">
                    Here's an overview of the Éclat platform performance
                </p>
            </div>

            <Separator />

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card
                            key={index}
                            className="hover:shadow-lg transition-shadow animate-slide-up"
                            style={{ animationDelay: `${index * 0.05}s` }}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-center justify-between mb-4">
                                    <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                                        <Icon className={stat.color} size={24} />
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
                                    <p className="text-3xl font-bold text-foreground mb-1">{stat.value}</p>
                                    <p className="text-xs text-muted-foreground">{stat.description}</p>
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}
            </div>

            <Separator />

            {/* Recent Activity */}
            <Card className="animate-fade-in">
                <CardHeader>
                    <CardTitle>Recent Admin Activity</CardTitle>
                    <CardDescription>Latest actions performed by administrators</CardDescription>
                </CardHeader>
                <CardContent>
                    {recentActivity.length === 0 ? (
                        <div className="text-center py-8">
                            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No recent activity</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {recentActivity.map((activity) => (
                                <div
                                    key={activity.id}
                                    className="flex items-start gap-4 p-4 rounded-lg bg-muted/30 border border-border/30 hover:bg-muted/50 transition-colors"
                                >
                                    <div className="flex-1">
                                        <p className="font-medium text-foreground">
                                            {getActionDescription(activity)}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
