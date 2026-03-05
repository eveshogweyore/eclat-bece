import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { BookOpen, Award, Target, Brain, Search, PlusCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";

interface QuizResult {
    id: string;
    student_id: string;
    subject: string;
    score: number;
    correct_answers: number;
    total_questions: number;
    completed_at: string;
    student_name?: string;
}

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
                    <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                        {activities.map((activity, index) => (
                            <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                {/* Timeline dot */}
                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-background bg-primary-light text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 z-10 transition-transform duration-300 group-hover:scale-110">
                                    {activity.score >= 80 ? <Award className="h-5 w-5" /> : <BookOpen className="h-5 w-5" />}
                                </div>

                                {/* Timeline card */}
                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-card shadow-sm hover:shadow-md transition-shadow">
                                    <div className="flex items-center justify-between mb-2 gap-2">
                                        <span className="font-bold text-foreground truncate">{activity.student_name}</span>
                                        <Badge variant={activity.score >= 80 ? "default" : "secondary"} className="shrink-0">
                                            {Math.round(activity.score)}%
                                        </Badge>
                                    </div>
                                    <div className="text-sm text-muted-foreground mb-3">
                                        Completed a <strong className="text-foreground font-semibold">{activity.subject}</strong> quiz
                                        ({activity.correct_answers}/{activity.total_questions} correct)
                                    </div>
                                    <div className="text-xs font-medium text-primary/80 lowercase">
                                        {formatDistanceToNow(new Date(activity.completed_at), { addSuffix: true })}
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
