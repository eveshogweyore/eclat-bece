import { Dialog, DialogContent, DialogHeader } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Award, Clock } from "lucide-react";

interface StudentReportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  studentName: string;
  studentClass: string;
  avatar?: string;
}

export function StudentReportDialog({ open, onOpenChange, studentName, studentClass, avatar }: StudentReportDialogProps) {
  const subjects = [
    { name: "Mathematics", score: 85, progress: 85, trend: "up", questionsCompleted: 156 },
    { name: "English Language", score: 78, progress: 78, trend: "up", questionsCompleted: 142 },
    { name: "Basic Science", score: 72, progress: 72, trend: "down", questionsCompleted: 128 },
    { name: "Social Studies", score: 88, progress: 88, trend: "up", questionsCompleted: 134 },
    { name: "Business Studies", score: 80, progress: 80, trend: "up", questionsCompleted: 120 },
  ];

  const overallStats = {
    avgScore: 81,
    totalQuestions: 680,
    accuracy: 81,
    streak: 7,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <div className="flex items-center gap-4">
            <img src="/src/assets/logo.png" alt="Éclat Logo" className="h-12 w-auto" />
            <div className="flex-1">
              <h2 className="text-2xl font-bold">Progress Report</h2>
              <p className="text-muted-foreground">Comprehensive performance overview</p>
            </div>
          </div>
        </DialogHeader>

        {/* Student Info */}
        <div className="flex items-center gap-4 p-4 bg-primary-light rounded-lg">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-3xl">
            {avatar || "👤"}
          </div>
          <div>
            <h3 className="text-xl font-bold">{studentName}</h3>
            <p className="text-muted-foreground">{studentClass}</p>
          </div>
        </div>

        {/* Overall Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{overallStats.avgScore}%</div>
              <div className="text-sm text-muted-foreground">Average Score</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">{overallStats.totalQuestions}</div>
              <div className="text-sm text-muted-foreground">Questions Completed</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{overallStats.accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="text-accent" size={20} />
                <div className="text-2xl font-bold">{overallStats.streak}</div>
              </div>
              <div className="text-sm text-muted-foreground">Day Streak</div>
            </CardContent>
          </Card>
        </div>

        {/* Subject Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Performance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjects.map((subject, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{subject.name}</span>
                    {subject.trend === "up" ? (
                      <TrendingUp className="text-primary" size={16} />
                    ) : (
                      <TrendingDown className="text-accent" size={16} />
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="gap-1">
                      <Clock size={12} />
                      {subject.questionsCompleted} questions
                    </Badge>
                    <span className="font-bold text-primary">{subject.score}%</span>
                  </div>
                </div>
                <Progress value={subject.progress} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Achievements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Achievements</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              <Badge className="px-3 py-2">🏆 Quiz Master</Badge>
              <Badge className="px-3 py-2">🔥 7-Day Streak</Badge>
              <Badge className="px-3 py-2">⭐ Top 10 Performer</Badge>
              <Badge className="px-3 py-2">📚 150+ Questions</Badge>
            </div>
          </CardContent>
        </Card>

        {/* Recommendations */}
        <Card className="border-primary">
          <CardHeader>
            <CardTitle>Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✓ Excellent progress in Mathematics and Social Studies</p>
            <p>✓ Consider more practice in Basic Science to improve confidence</p>
            <p>✓ Maintain daily practice routine for best results</p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
