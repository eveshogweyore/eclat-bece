import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Users, Award, BookOpen } from "lucide-react";

interface ClassAnalyticsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  className?: string;
}

export function ClassAnalyticsDialog({ open, onOpenChange, className }: ClassAnalyticsDialogProps) {
  const classStats = {
    totalStudents: 35,
    averageScore: 76,
    topPerformer: "Chinonso Okafor",
    topScore: 94,
    completionRate: 82,
  };

  const subjectPerformance = [
    { subject: "Mathematics", avgScore: 78, studentsAbove70: 28, totalStudents: 35 },
    { subject: "English Language", avgScore: 74, studentsAbove70: 25, totalStudents: 35 },
    { subject: "Basic Science", avgScore: 72, studentsAbove70: 24, totalStudents: 35 },
    { subject: "Social Studies", avgScore: 80, studentsAbove70: 30, totalStudents: 35 },
    { subject: "Business Studies", avgScore: 77, studentsAbove70: 27, totalStudents: 35 },
  ];

  const topPerformers = [
    { name: "Chinonso Okafor", score: 94, improvement: "+8%" },
    { name: "Amara Nwosu", score: 91, improvement: "+5%" },
    { name: "Emeka Adebayo", score: 89, improvement: "+12%" },
    { name: "Zainab Mohammed", score: 87, improvement: "+6%" },
    { name: "Tunde Olawale", score: 85, improvement: "+3%" },
  ];

  const needsAttention = [
    { name: "Ibrahim Yusuf", score: 58, subjects: ["Mathematics", "Basic Science"] },
    { name: "Blessing Okonkwo", score: 62, subjects: ["English Language"] },
    { name: "Chidi Eze", score: 65, subjects: ["Mathematics"] },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img src="/src/assets/logo.png" alt="Éclat Logo" className="h-10 w-auto" />
            <div>
              <DialogTitle className="text-2xl">{className} - Class Analytics</DialogTitle>
              <p className="text-muted-foreground">Comprehensive class performance overview</p>
            </div>
          </div>
        </DialogHeader>

        {/* Overall Class Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{classStats.totalStudents}</div>
              <div className="text-xs text-muted-foreground">Total Students</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-accent">{classStats.averageScore}%</div>
              <div className="text-xs text-muted-foreground">Class Average</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-primary">{classStats.completionRate}%</div>
              <div className="text-xs text-muted-foreground">Completion Rate</div>
            </CardContent>
          </Card>
          <Card className="col-span-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Award className="text-accent" size={20} />
                <div>
                  <div className="font-bold">{classStats.topPerformer}</div>
                  <div className="text-xs text-muted-foreground">Top Performer - {classStats.topScore}%</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subject Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="text-primary" size={20} />
              Subject Performance Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectPerformance.map((subject, idx) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{subject.subject}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {subject.studentsAbove70}/{subject.totalStudents} students above 70%
                    </span>
                    <Badge variant="outline">{subject.avgScore}%</Badge>
                  </div>
                </div>
                <Progress value={subject.avgScore} className="h-2" />
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Top Performers */}
          <Card className="border-primary">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="text-primary" />
                Top 5 Performers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {topPerformers.map((student, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-primary-light rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold">
                        {idx + 1}
                      </div>
                      <span className="font-medium">{student.name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className="bg-primary">
                        <TrendingUp size={12} />
                        {student.improvement}
                      </Badge>
                      <span className="font-bold">{student.score}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Needs Attention */}
          <Card className="border-accent">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="text-accent" />
                Students Needing Support
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {needsAttention.map((student, idx) => (
                  <div key={idx} className="p-3 bg-accent-light rounded-lg border border-accent">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{student.name}</span>
                      <Badge variant="outline" className="bg-background">{student.score}%</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {student.subjects.map((subject, subIdx) => (
                        <Badge key={subIdx} variant="outline" className="text-xs">
                          {subject}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="border-2 border-primary">
          <CardHeader>
            <CardTitle>Class Recommendations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p>✓ Overall class performance is good with 76% average</p>
            <p>✓ Focus additional support on Mathematics and Basic Science</p>
            <p>✓ Consider peer tutoring program with top performers</p>
            <p>✓ Schedule extra practice sessions for students below 65%</p>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
}
