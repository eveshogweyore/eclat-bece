import { Award, BookOpen, Target, MoreVertical, CreditCard, ChevronRight, Trash2, User, Key, Fingerprint } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { LinkedChild, ChildAnalytics } from "@/types/parent";

interface ChildOverviewCardProps {
    child: LinkedChild;
    analytics?: ChildAnalytics;
    index: number;
    onViewReport: (child: LinkedChild) => void;
    onAssignPractice: (child: LinkedChild) => void;
    onUpgradePremium: (child: LinkedChild) => void;
    onDeleteChild: (child: LinkedChild) => void;
    onEditName: (child: LinkedChild) => void;
    onEditUsername: (child: LinkedChild) => void;
    onChangePassword: (child: LinkedChild) => void;
}

export function ChildOverviewCard({
    child,
    analytics,
    index,
    onViewReport,
    onAssignPractice,
    onUpgradePremium,
    onDeleteChild,
    onEditName,
    onEditUsername,
    onChangePassword
}: ChildOverviewCardProps) {
    const initials = child.profile.full_name?.charAt(0).toUpperCase() || "?";

    return (
        <Card
            className="group border-2 hover:border-primary/30 hover:shadow-xl transition-all duration-300 animate-scale-in overflow-hidden relative"
            style={{ animationDelay: `${index * 0.1}s` }}
        >
            {child.is_premium && (
                <div className="absolute top-0 left-0 w-2 h-full bg-gradient-to-b from-amber-400 to-amber-600 z-10" title="Premium Student" />
            )}

            <CardHeader className="pb-4">
                <div className="flex flex-col gap-4">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className={`
                                h-14 w-14 sm:h-16 sm:w-16 rounded-2xl flex items-center justify-center text-2xl font-black text-white shrink-0 shadow-lg 
                                transition-transform group-hover:rotate-3 group-hover:scale-110 duration-300
                                ${child.is_premium ? 'bg-gradient-to-br from-amber-400 to-amber-600' : 'bg-gradient-hero'}
                            `}>
                                {initials}
                            </div>
                            <div className="space-y-1.5 min-w-0">
                                <CardTitle
                                    className="text-xl sm:text-2xl font-black tracking-tight text-foreground truncate"
                                    title={child.profile.full_name || "Unknown"}
                                >
                                    {child.profile.full_name || "Unknown"}
                                </CardTitle>
                                <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                                    {child.is_premium ? (
                                        <Badge variant="secondary" className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 uppercase font-black text-[10px] py-0.5 whitespace-nowrap">
                                            Premium
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-muted-foreground uppercase font-bold text-[10px] py-0.5 whitespace-nowrap">
                                            Standard
                                        </Badge>
                                    )}
                                    <span className="inline-flex items-center rounded-lg bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary border border-primary/20 uppercase whitespace-nowrap">
                                        {child.class_year === "year_6" ? "Year 6" : child.class_year === "year_9" ? "Year 9" : "N/A"}
                                    </span>
                                    <div className="flex items-center gap-2 min-w-0">
                                        <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-lg border border-border/50 whitespace-nowrap">
                                            ID: {child.profile.unique_id}
                                        </span>
                                        {child.profile.username && (
                                            <span className="text-[10px] font-mono text-muted-foreground/60 bg-muted/30 px-2 py-0.5 rounded-lg border border-border/50 truncate max-w-[120px]" title={child.profile.username}>
                                                {child.profile.username}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10 shrink-0">
                                    <MoreVertical size={20} className="text-muted-foreground" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-xl p-1 shadow-xl border-border/50 backdrop-blur-md">
                                {!child.is_premium && (
                                    <DropdownMenuItem
                                        className="rounded-lg text-amber-600 dark:text-amber-400 font-black flex items-center gap-2"
                                        onClick={() => onUpgradePremium(child)}
                                    >
                                        <CreditCard size={14} />
                                        Upgrade Premium
                                    </DropdownMenuItem>
                                )}
                                <DropdownMenuItem
                                    className="rounded-lg font-bold flex items-center gap-2"
                                    onClick={() => onEditName(child)}
                                >
                                    <User size={14} />
                                    Edit Name
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="rounded-lg font-bold flex items-center gap-2"
                                    onClick={() => onEditUsername(child)}
                                >
                                    <Fingerprint size={14} />
                                    Edit Username
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="rounded-lg font-bold flex items-center gap-2"
                                    onClick={() => onChangePassword(child)}
                                >
                                    <Key size={14} />
                                    Change Password
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="rounded-lg text-destructive font-bold focus:bg-destructive/10 focus:text-destructive flex items-center gap-2"
                                    onClick={() => onDeleteChild(child)}
                                >
                                    <Trash2 size={14} />
                                    Delete Account
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    <div className="flex items-center gap-2 pt-1 border-t border-border/40 sm:border-none sm:pt-0">
                        <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 sm:flex-none rounded-xl font-bold border-2 h-9 hover:bg-muted"
                            onClick={() => onViewReport(child)}
                        >
                            View Report
                        </Button>
                        <Button
                            variant="hero"
                            size="sm"
                            className="flex-1 sm:flex-none rounded-xl font-bold h-9 shadow-lg shadow-primary/20 bg-primary text-white"
                            onClick={() => onAssignPractice(child)}
                        >
                            Assign Task
                        </Button>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="space-y-6 pt-2">
                {analytics ? (
                    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
                        {/* Optimized Metrics Grid */}
                        <div className="grid grid-cols-3 gap-3 sm:gap-4">
                            <div className="p-4 rounded-3xl bg-primary/5 border border-primary/10 transition-all hover:bg-primary/10 group/stat">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black text-primary uppercase tracking-widest opacity-70">Avg</p>
                                    <Award className="h-4 w-4 text-primary group-hover/stat:scale-110 transition-transform" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                                    {analytics.averageScore}<span className="text-sm font-bold opacity-50 ml-0.5">%</span>
                                </p>
                            </div>
                            <div className="p-4 rounded-3xl bg-emerald-500/5 border border-emerald-500/10 transition-all hover:bg-emerald-500/10 group/stat">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest opacity-70">Quizzes</p>
                                    <Target className="h-4 w-4 text-emerald-600 group-hover/stat:rotate-12 transition-transform" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                                    {analytics.totalQuizzes}
                                </p>
                            </div>
                            <div className="p-4 rounded-3xl bg-sky-500/5 border border-sky-500/10 transition-all hover:bg-sky-500/10 group/stat">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-[10px] font-black text-sky-600 uppercase tracking-widest opacity-70">Subjects</p>
                                    <BookOpen className="h-4 w-4 text-sky-600 group-hover/stat:-translate-y-1 transition-transform" />
                                </div>
                                <p className="text-2xl sm:text-3xl font-black text-foreground tabular-nums">
                                    {analytics.subjectPerformance.length}
                                </p>
                            </div>
                        </div>

                        {/* Performance Visualizer (Chart) */}
                        {analytics.subjectPerformance.length > 0 && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <h4 className="font-black text-[11px] uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                                        <span className="w-2 h-2 rounded-full bg-primary/60" />
                                        Subject Mastery
                                    </h4>
                                    <Button variant="link" className="h-auto p-0 text-[10px] font-black uppercase text-primary" onClick={() => onViewReport(child)}>
                                        Full Analysis <ChevronRight size={10} className="ml-0.5" />
                                    </Button>
                                </div>
                                <div className="h-[140px] w-full bg-muted/20 rounded-[2rem] border border-border/50 p-4 shadow-inner relative overflow-hidden group/chart">
                                    <div className="absolute inset-0 bg-gradient-to-t from-background/20 to-transparent opacity-0 group-hover/chart:opacity-100 transition-opacity" />
                                    <ChartContainer
                                        config={{
                                            avgScore: {
                                                label: "Average Score",
                                                color: "hsl(var(--primary))",
                                            },
                                        }}
                                    >
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={analytics.subjectPerformance}>
                                                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
                                                <XAxis
                                                    dataKey="subject"
                                                    axisLine={false}
                                                    tickLine={false}
                                                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10, fontWeight: 700 }}
                                                    dy={10}
                                                />
                                                <ChartTooltip cursor={{ fill: 'var(--primary)', opacity: 0.1 }} content={<ChartTooltipContent />} />
                                                <Bar
                                                    dataKey="avgScore"
                                                    fill="hsl(var(--primary))"
                                                    radius={[6, 6, 0, 0]}
                                                    maxBarSize={32}
                                                    animationDuration={1500}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </ChartContainer>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10 px-4 bg-muted/30 rounded-[2.5rem] border border-dashed border-border/60 transition-colors group-hover:bg-muted/40">
                        <div className="w-16 h-16 bg-background rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm group-hover:rotate-12 transition-transform">
                            <BookOpen className="h-8 w-8 text-muted-foreground/30" />
                        </div>
                        <p className="font-black text-xs uppercase tracking-widest text-foreground/60 mb-1">Learning Journey Starting</p>
                        <p className="text-[11px] text-muted-foreground max-w-[200px] mx-auto leading-relaxed font-medium">
                            Real-time performance analytics will activate once practice sessions begin.
                        </p>
                        <Button variant="hero" size="sm" className="mt-4 rounded-xl font-black text-xs h-10 px-6 uppercase tracking-wider" onClick={() => onAssignPractice(child)}>
                            ASSIGN FIRST TASK
                        </Button>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
