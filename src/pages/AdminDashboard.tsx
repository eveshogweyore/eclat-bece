import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, BookOpen, Trophy, TrendingUp, Activity, Shield, ChevronLeft, ChevronRight, UserPlus, UserMinus, Edit, Trash2, Mail, Upload, Search, Download, Filter, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "react-router-dom";

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
    resource_id: string | null;
    details: any;
    created_at: string;
    admin: {
        full_name: string;
    } | null;
}

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [adminName, setAdminName] = useState("Admin");
    const [isSuperAdmin, setIsSuperAdmin] = useState(false);
    const [pendingFlagsCount, setPendingFlagsCount] = useState(0);
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
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [searchQuery, setSearchQuery] = useState("");
    const [actionFilter, setActionFilter] = useState<string>("all");
    const [resourceFilter, setResourceFilter] = useState<string>("all");
    const ITEMS_PER_PAGE = 10;

    useEffect(() => {
        fetchAdminData();
        fetchPlatformStats();
    }, [user]);

    useEffect(() => {
        const timer = setTimeout(() => {
            setCurrentPage(1); // Reset to first page when filters change
            fetchRecentActivity();
        }, 300); // Debounce search

        return () => clearTimeout(timer);
    }, [searchQuery, actionFilter, resourceFilter]);

    useEffect(() => {
        fetchRecentActivity();
    }, [currentPage]);

    const fetchAdminData = async () => {
        if (!user) return;

        const { data } = await supabase
            .from("admins" as any)
            .select("full_name, is_super_admin")
            .eq("user_id", user.id)
            .single() as any;

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

            // Count pending flagged questions
            const { count: flagsCount } = await supabase
                .from("flagged_questions")
                .select("*", { count: "exact", head: true })
                .eq("status", "pending");

            setPendingFlagsCount(flagsCount || 0);
        } catch (error) {
            console.error("Error fetching stats:", error);
        } finally {
            setLoading(false);
        }
    };

    const fetchRecentActivity = async () => {
        try {
            let query = supabase
                .from("admin_audit_log" as any)
                .select(`
          id,
          action,
          resource_type,
          resource_id,
          details,
          created_at,
          admin:admins(full_name)
        `, { count: 'exact' });

            // Apply action filter
            if (actionFilter !== "all") {
                query = query.ilike('action', `%${actionFilter}%`);
            }

            // Apply resource filter
            if (resourceFilter !== "all") {
                query = query.eq('resource_type', resourceFilter);
            }

            // Apply search (search in admin name or details)
            if (searchQuery) {
                // Note: This is a simplified search. For better performance,
                // consider using PostgreSQL full-text search
                query = query.or(`details->>admin_name.ilike.%${searchQuery}%,details->>admin_email.ilike.%${searchQuery}%,details->>target_user_email.ilike.%${searchQuery}%,details->>email.ilike.%${searchQuery}%`);
            }

            const { data, count } = await query
                .order("created_at", { ascending: false })
                .range((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE - 1) as any;

            if (data) {
                setRecentActivity(data as RecentActivity[]);
                setTotalPages(Math.ceil((count || 0) / ITEMS_PER_PAGE));
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
        {
            title: "Question Flags",
            value: pendingFlagsCount.toString(),
            icon: Flag,
            color: "text-red-600",
            bgColor: "bg-red-100 dark:bg-red-900/30",
            description: "Pending reports",
            link: "/admin/flags",
        },
    ];

    const getActivityInfo = (activity: RecentActivity) => {
        const adminName = activity.admin?.full_name || "Unknown Admin";
        const action = activity.action;
        const resourceType = activity.resource_type;

        // Map resource types to friendly names
        const resourceTypeMap: Record<string, string> = {
            'admin_invitation': 'admin invitation',
            'admin': 'administrator',
            'question': 'question',
            'passage': 'passage',
            'comprehension_passage': 'passage',
            'user': 'user',
            'student': 'student',
            'parent': 'parent',
            'school': 'school',
        };

        const friendlyResourceType = resourceTypeMap[resourceType] || resourceType.replace(/_/g, ' ');

        let icon = Activity;
        let color = "text-gray-600";
        let bgColor = "bg-gray-100 dark:bg-gray-900/30";
        let description = "";

        // Determine icon, color, and description based on action
        if (action.includes("create") || action.includes("add")) {
            icon = UserPlus;
            color = "text-green-600";
            bgColor = "bg-green-100 dark:bg-green-900/30";
            description = `created ${friendlyResourceType === 'admin invitation' ? 'an' : 'a'} ${friendlyResourceType}`;
        } else if (action.includes("delete") || action.includes("remove")) {
            icon = Trash2;
            color = "text-red-600";
            bgColor = "bg-red-100 dark:bg-red-900/30";
            description = `deleted ${friendlyResourceType === 'admin invitation' ? 'an' : 'a'} ${friendlyResourceType}`;
        } else if (action.includes("deactivate")) {
            icon = UserMinus;
            color = "text-orange-600";
            bgColor = "bg-orange-100 dark:bg-orange-900/30";
            description = `deactivated ${friendlyResourceType === 'admin invitation' ? 'an' : 'a'} ${friendlyResourceType}`;
        } else if (action.includes("reactivate") || action.includes("activate")) {
            icon = UserPlus;
            color = "text-emerald-600";
            bgColor = "bg-emerald-100 dark:bg-emerald-900/30";
            description = `reactivated ${friendlyResourceType === 'admin invitation' ? 'an' : 'a'} ${friendlyResourceType}`;
        } else if (action.includes("update") || action.includes("edit") || action.includes("modify")) {
            icon = Edit;
            color = "text-blue-600";
            bgColor = "bg-blue-100 dark:bg-blue-900/30";
            description = `updated ${friendlyResourceType === 'admin invitation' ? 'an' : 'a'} ${friendlyResourceType}`;
        } else if (action.includes("invitation") || action.includes("invite")) {
            icon = Mail;
            color = "text-purple-600";
            bgColor = "bg-purple-100 dark:bg-purple-900/30";
            description = `sent an invitation`;
        } else if (action.includes("bulk_upload")) {
            icon = Upload;
            color = "text-indigo-600";
            bgColor = "bg-indigo-100 dark:bg-indigo-900/30";
            description = `uploaded questions via CSV`;
        } else {
            // Fallback: make action more readable
            const readableAction = action.replace(/_/g, ' ');
            description = `performed "${readableAction}" on ${friendlyResourceType}`;
        }

        return { adminName, description, icon, color, bgColor };
    };

    const exportToCSV = () => {
        // Create CSV header
        const headers = ['Date', 'Admin', 'Action', 'Resource Type', 'Details'];

        // Create CSV rows
        const rows = recentActivity.map(activity => {
            const { adminName, description } = getActivityInfo(activity);
            const date = new Date(activity.created_at).toLocaleString();
            const details = activity.details ? JSON.stringify(activity.details) : '';

            return [
                date,
                adminName,
                description,
                activity.resource_type,
                details
            ].map(field => `"${field}"`).join(',');
        });

        // Combine header and rows
        const csv = [headers.join(','), ...rows].join('\n');

        // Create and download file
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `admin-activity-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
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

            {/* Warning Banner for Unresolved Flags */}
            {pendingFlagsCount > 0 && (
                <div 
                    onClick={() => navigate("/admin/flags")}
                    className="flex items-center gap-3 p-4 bg-destructive/10 border border-destructive/20 rounded-xl text-destructive-foreground hover:bg-destructive/15 transition-all cursor-pointer animate-fade-in"
                >
                    <Flag className="h-5 w-5 text-destructive animate-bounce" />
                    <div className="flex-1">
                        <p className="font-semibold text-sm text-destructive dark:text-red-400">
                            ⚠️ Question Flags Requiring Review
                        </p>
                        <p className="text-xs text-muted-foreground">
                            There are {pendingFlagsCount} flagged questions reported by students. Click here to review and resolve them.
                        </p>
                    </div>
                    <Button variant="ghost" size="sm" className="h-8 text-xs text-destructive hover:bg-destructive/10">
                        View Reports
                    </Button>
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {statCards.map((stat, index) => {
                    const Icon = stat.icon;
                    return (
                        <Card
                            key={index}
                            onClick={() => stat.link && navigate(stat.link)}
                            className={`hover:shadow-lg transition-shadow animate-slide-up ${
                                stat.link 
                                    ? 'cursor-pointer border-red-500/20 hover:border-red-500/50 hover:bg-red-50/5' 
                                    : ''
                            }`}
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
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center justify-between">
                            <div>
                                <CardTitle>Recent Admin Activity</CardTitle>
                                <CardDescription>Latest actions performed by administrators</CardDescription>
                            </div>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={exportToCSV}
                                disabled={recentActivity.length === 0}
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Export CSV
                            </Button>
                        </div>

                        {/* Filters and Search */}
                        <div className="flex flex-col sm:flex-row gap-3">
                            {/* Search */}
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by email or details..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    className="pl-9"
                                />
                            </div>

                            {/* Action Filter */}
                            <Select value={actionFilter} onValueChange={setActionFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <Filter className="h-4 w-4 mr-2" />
                                    <SelectValue placeholder="Action type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Actions</SelectItem>
                                    <SelectItem value="create">Create</SelectItem>
                                    <SelectItem value="delete">Delete</SelectItem>
                                    <SelectItem value="update">Update</SelectItem>
                                    <SelectItem value="deactivate">Deactivate</SelectItem>
                                    <SelectItem value="reactivate">Reactivate</SelectItem>
                                    <SelectItem value="invitation">Invitation</SelectItem>
                                </SelectContent>
                            </Select>

                            {/* Resource Filter */}
                            <Select value={resourceFilter} onValueChange={setResourceFilter}>
                                <SelectTrigger className="w-full sm:w-[180px]">
                                    <SelectValue placeholder="Resource type" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Resources</SelectItem>
                                    <SelectItem value="admin">Admin</SelectItem>
                                    <SelectItem value="question">Question</SelectItem>
                                    <SelectItem value="passage">Passage</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeft className="h-4 w-4" />
                                </Button>
                                <span className="text-sm text-muted-foreground">
                                    Page {currentPage} of {totalPages}
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    <ChevronRight className="h-4 w-4" />
                                </Button>
                            </div>
                        )}
                    </div>
                </CardHeader>
                <CardContent>
                    {recentActivity.length === 0 ? (
                        <div className="text-center py-12">
                            <Activity className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                            <p className="text-muted-foreground">No recent activity</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {recentActivity.map((activity) => {
                                const { adminName, description, icon: Icon, color, bgColor } = getActivityInfo(activity);
                                return (
                                    <div
                                        key={activity.id}
                                        className="flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:border-border hover:shadow-sm transition-all duration-200"
                                    >
                                        <div className={`p-2.5 rounded-lg ${bgColor} flex-shrink-0`}>
                                            <Icon className={`w-5 h-5 ${color}`} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="flex-1">
                                                    <p className="font-medium text-foreground">
                                                        <span className="text-primary">{adminName}</span>
                                                        {" "}
                                                        <span className="text-muted-foreground font-normal">{description}</span>
                                                    </p>
                                                    {activity.details && Object.keys(activity.details).length > 0 && (
                                                        <p className="text-sm text-muted-foreground mt-1">
                                                            {/* Admin-related details */}
                                                            {activity.details.admin_name && `Admin: ${activity.details.admin_name}`}
                                                            {activity.details.admin_email && ` (${activity.details.admin_email})`}

                                                            {/* Invitation details */}
                                                            {activity.details.target_user_email && `Email: ${activity.details.target_user_email}`}
                                                            {activity.details.email && !activity.details.target_user_email && `Email: ${activity.details.email}`}

                                                            {/* Question details */}
                                                            {activity.details.question_text && `Question: ${activity.details.question_text.substring(0, 50)}...`}
                                                            {activity.details.subject && ` • Subject: ${activity.details.subject}`}
                                                            {activity.details.difficulty && ` • ${activity.details.difficulty}`}

                                                            {/* Passage details */}
                                                            {activity.details.title && `Title: ${activity.details.title}`}
                                                            {activity.details.passage_preview && ` • ${activity.details.passage_preview.substring(0, 50)}...`}

                                                            {/* Status changes */}
                                                            {activity.details.previous_status && activity.details.new_status &&
                                                                ` • Status: ${activity.details.previous_status} → ${activity.details.new_status}`}
                                                        </p>
                                                    )}
                                                </div>
                                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                                    {formatDistanceToNow(new Date(activity.created_at), { addSuffix: true })}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
