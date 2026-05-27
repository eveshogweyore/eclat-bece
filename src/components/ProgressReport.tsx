import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, Download, Calendar, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface SubjectProgress {
  subject: string;
  currentScore: number;
  improvement: number;
  questionsCompleted: number;
  accuracy: number;
}

interface ProgressReportProps {
  subjectProgress?: SubjectProgress[];
  totalQuestionsCompleted?: number;
  overallAccuracy?: number;
  questionsThisWeek?: number;
  accuracyTrend?: string;
  strongAreas?: string;
  weaknessAreas?: string;
  studyAnalytics?: {
    streak: number;
    hours: number;
    gain: number;
    consistency: number;
  };
}

export const ProgressReport = ({
  subjectProgress = [],
  totalQuestionsCompleted = 0,
  overallAccuracy = 0,
  questionsThisWeek = 0,
  accuracyTrend = "↑ 0% from last month",
  strongAreas = "No data yet",
  weaknessAreas = "No data yet",
  studyAnalytics = {
    streak: 0,
    hours: 0,
    gain: 0,
    consistency: 0
  }
}: ProgressReportProps) => {
  const [expanded, setExpanded] = useState(false);
  const totalScore = subjectProgress.reduce((sum, item) => sum + item.currentScore, 0);
  const avgScore = subjectProgress.length > 0 ? Math.round(totalScore / subjectProgress.length) : 0;

  const handleExportPDF = () => {
    try {
      window.print();
    } catch (e) {
      toast.error("Failed to trigger print dialog");
    }
  };

  if (subjectProgress.length === 0) {
    return (
      <Card className="border-2 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm rounded-[2rem]">
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
                <TrendingUp className="text-accent animate-pulse" size={24} />
                Progress Report
              </CardTitle>
              <CardDescription>Your exam prep journey at a glance</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="py-16 text-center flex flex-col items-center justify-center space-y-6">
          <div className="bg-primary/5 w-20 h-20 rounded-full flex items-center justify-center text-primary shadow-inner">
            <TrendingUp size={40} />
          </div>
          <div className="space-y-2">
            <h3 className="font-black text-xl text-foreground">No progress data yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
              Once you complete a few practice quizzes, your performance reports, strengths, and study trends will show up here.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Find lowest scoring subject to recommend focusing on it
  const lowestSubject = [...subjectProgress].sort((a, b) => a.currentScore - b.currentScore)[0]?.subject;

  return (
    <Card className="border-2 border-border/50 bg-background/50 backdrop-blur-sm shadow-sm rounded-[2rem] overflow-hidden">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2 text-2xl font-black tracking-tight text-foreground">
              <TrendingUp className="text-accent" size={24} />
              Progress Report
            </CardTitle>
            <CardDescription>Your exam prep journey at a glance</CardDescription>
          </div>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleExportPDF} className="rounded-xl border-2 font-bold gap-2">
              <Download size={16} />
              Export PDF
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setExpanded(!expanded)}
              className="rounded-xl"
            >
              {expanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Stats */}
        <div className="grid md:grid-cols-3 gap-4 p-6 bg-gradient-to-br from-primary/10 to-accent/10 rounded-[1.5rem] border border-primary/10">
          <div className="text-center space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Average Score</p>
            <p className="text-4xl font-black text-primary">{avgScore}%</p>
            <p className="text-[11px] font-bold text-muted-foreground">across all subjects</p>
          </div>
          <div className="text-center space-y-1 border-y md:border-y-0 md:border-x border-border/30 py-4 md:py-0">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Questions Completed</p>
            <p className="text-4xl font-black text-accent">{totalQuestionsCompleted}</p>
            <p className="text-[11px] font-bold text-accent">+{questionsThisWeek} this week</p>
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Overall Accuracy</p>
            <p className="text-4xl font-black text-primary">{overallAccuracy}%</p>
            <p className="text-[11px] font-bold text-accent">{accuracyTrend}</p>
          </div>
        </div>

        {/* Subject Breakdown */}
        <div className="space-y-4">
          <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <Calendar size={14} className="text-primary" />
            Subject Breakdown
          </h4>
          <div className="grid gap-4">
            {subjectProgress.map((subject, index) => (
              <div key={index} className="p-5 border rounded-2xl bg-card/30 backdrop-blur-sm space-y-3 hover:border-primary/20 transition-all duration-300">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h5 className="font-black text-lg text-foreground">{subject.subject}</h5>
                    <p className="text-xs font-bold text-muted-foreground">
                      {subject.questionsCompleted} questions completed
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-3xl font-black text-primary">{subject.currentScore}%</p>
                    <p className="text-xs font-black text-emerald-500">
                      {subject.improvement >= 0 ? `+${subject.improvement}` : subject.improvement} points
                    </p>
                  </div>
                </div>
                
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs font-black uppercase tracking-widest text-muted-foreground/80">
                    <span>Accuracy</span>
                    <span>{subject.accuracy}%</span>
                  </div>
                  <div className="h-2.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-hero rounded-full transition-all duration-500"
                      style={{ width: `${subject.accuracy}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {lowestSubject && (
          <div className="p-4 bg-primary/5 rounded-2xl border border-primary/10 text-sm leading-relaxed">
            <span className="font-black text-primary uppercase tracking-wider text-[11px] block mb-1">Study recommendation</span>
            Focus on <span className="font-black text-foreground">{lowestSubject}</span> to boost your overall average score. Keep practicing!
          </div>
        )}

        {/* Expanded Details */}
        {expanded && (
          <div className="mt-6 pt-6 border-t border-border/40 space-y-6 animate-fade-in">
            <h4 className="font-black text-xs uppercase tracking-widest text-muted-foreground">Study Analytics</h4>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-2xl border border-border/30">
                <div className="text-3xl font-black text-green-500">{studyAnalytics.streak}</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-1">Day Streak</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-2xl border border-border/30">
                <div className="text-3xl font-black text-primary">{studyAnalytics.hours}h</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-1">Total Hours</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-2xl border border-border/30">
                <div className="text-3xl font-black text-accent">
                  {studyAnalytics.gain >= 0 ? `+${studyAnalytics.gain}%` : `${studyAnalytics.gain}%`}
                </div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-1">Score Gain</div>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-2xl border border-border/30">
                <div className="text-3xl font-black text-primary">{studyAnalytics.consistency}%</div>
                <div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground mt-1">Consistency</div>
              </div>
            </div>

            <div className="space-y-3 mt-4">
              <h5 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Strengths & Weaknesses</h5>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-2xl">
                  <p className="text-xs font-black text-green-500 uppercase tracking-widest mb-1.5">Strongest Subject</p>
                  <p className="text-sm font-bold text-foreground leading-snug">{strongAreas}</p>
                </div>
                <div className="p-4 bg-amber-500/5 border border-amber-500/10 rounded-2xl">
                  <p className="text-xs font-black text-amber-500 uppercase tracking-widest mb-1.5">Needs Focus</p>
                  <p className="text-sm font-bold text-foreground leading-snug">{weaknessAreas}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
