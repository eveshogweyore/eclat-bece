import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Award, Target, Brain, Search, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

import { QuizResult } from "@/types/parent";

interface ParentActivityFeedProps {
    activities: QuizResult[];
    isLoading: boolean;
}

export function ParentActivityFeed({ activities, isLoading }: ParentActivityFeedProps) {
    if (isLoading) {
        return (
            <Card className="border-border">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Target className="h-5 w-5 text-primary" />
                        Recent Activity
                    </CardTitle>
                    <CardDescription>Loading recent activities...</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="animate-pulse flex items-start gap-4 p-3 border rounded-lg">
                            <div className="w-10 h-10 bg-muted rounded-full"></div>
                            <div className="flex-1 space-y-2">
                                <div className="h-4 bg-muted rounded w-3/4"></div>
                                <div className="h-3 bg-muted rounded w-1/2"></div>
                            </div>
                        </div>
                    ))}
                </CardContent>
            </Card>
        );
    }

    return (
        <Card className="border-border shadow-sm h-full max-h-[600px] flex flex-col">
            <CardHeader className="pb-3 border-b">
                <CardTitle className="text-lg flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    Recent Activity Timeline
                </CardTitle>
                <CardDescription>Latest learning milestones across all your children</CardDescription>
            </CardHeader>
            <CardContent className="overflow-y-auto pt-4 flex-1">
                {activities.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground flex flex-col items-center justify-center h-full">
                        <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mb-4">
                            <Brain className="h-8 w-8 text-muted-foreground opacity-50" />
                        </div>
                        <p className="font-medium text-foreground">No recent activity</p>
                        <p className="text-sm">Quizzes completed by your children will appear here.</p>
                    </div>
                ) : (
                    <div className="space-y-6 relative before:absolute before:inset-y-0 before:left-4 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-primary/20 before:via-border before:to-transparent">
                        {activities.map((activity) => (
                            <div key={activity.id} className="relative flex items-start gap-4 group">
                                {/* Timeline dot */}
                                <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-background bg-primary-light text-primary shadow-sm shrink-0 z-10 transition-transform duration-300 group-hover:scale-110 mt-1">
                                    {activity.score >= 80 ? <Award className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                                </div>

                                {/* Timeline card */}
                                <div className="flex-1 p-4 rounded-2xl border bg-card/50 backdrop-blur-sm shadow-sm hover:shadow-md transition-all duration-300 min-w-0 hover:border-primary/20">
                                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-black text-foreground text-sm sm:text-base truncate">{activity.student_name}</span>
                                            <Badge variant={activity.score >= 80 ? "default" : "secondary"} className="shrink-0 text-[10px] font-black">
                                                {Math.round(activity.score)}%
                                            </Badge>
                                        </div>
                                        <span className="text-[10px] font-semibold text-muted-foreground whitespace-nowrap">
                                            {formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true })}
                                        </span>
                                    </div>
                                    <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                                        Completed a <strong className="text-foreground font-bold">{activity.subject}</strong> quiz
                                        {" "}(<span className="font-mono text-primary font-bold">{activity.correct_answers}/{activity.total_questions}</span> correct)
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
