import { useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, TrendingDown, Target, Award, AlertCircle } from "lucide-react";

export default function SubjectAnalytics() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const subject = searchParams.get("subject") || "Subject";

  const analytics = {
    "Algebraic Processes": {
      overallScore: 65,
      questionsAttempted: 45,
      accuracy: 65,
      strengths: [
        { topic: "Linear Equations", score: 85, questions: 15 },
        { topic: "Factorization", score: 78, questions: 12 },
      ],
      weaknesses: [
        { topic: "Quadratic Equations", score: 45, questions: 10 },
        { topic: "Word Problems", score: 52, questions: 8 },
      ],
      recommendations: [
        "Practice more quadratic equation problems",
        "Focus on translating word problems into equations",
        "Review factorization techniques for complex expressions",
      ],
      improvementTrend: "up",
    },
    "Essay Writing": {
      overallScore: 68,
      questionsAttempted: 28,
      accuracy: 68,
      strengths: [
        { topic: "Introduction & Conclusion", score: 82, questions: 10 },
        { topic: "Grammar & Punctuation", score: 75, questions: 8 },
      ],
      weaknesses: [
        { topic: "Paragraph Development", score: 55, questions: 6 },
        { topic: "Argumentative Structure", score: 58, questions: 4 },
      ],
      recommendations: [
        "Practice developing coherent paragraphs with topic sentences",
        "Study argumentative essay structure and counter-arguments",
        "Read more sample essays for different topics",
      ],
      improvementTrend: "down",
    },
  };

  const data = analytics[subject as keyof typeof analytics] || analytics["Algebraic Processes"];

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-light/20 via-background to-accent-light/20">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft size={20} />
          </Button>
          <img src="/src/assets/logo.png" alt="Éclat Logo" className="h-10 w-auto" />
          <h1 className="text-xl font-bold">Subject Analytics</h1>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Subject Header */}
        <div className="mb-8 animate-fade-in">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-3xl font-bold mb-2">{subject}</h2>
              <p className="text-muted-foreground">Detailed performance analysis and recommendations</p>
            </div>
            <Badge className="flex items-center gap-1">
              {data.improvementTrend === "up" ? (
                <>
                  <TrendingUp size={16} />
                  Improving
                </>
              ) : (
                <>
                  <TrendingDown size={16} />
                  Needs Focus
                </>
              )}
            </Badge>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="grid md:grid-cols-3 gap-4 mb-8 animate-scale-in">
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-primary mb-2">{data.overallScore}%</div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              <Progress value={data.overallScore} className="mt-2 h-2" />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-accent mb-2">{data.questionsAttempted}</div>
              <div className="text-sm text-muted-foreground">Questions Attempted</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-3xl font-bold text-primary mb-2">{data.accuracy}%</div>
              <div className="text-sm text-muted-foreground">Accuracy Rate</div>
              <Progress value={data.accuracy} className="mt-2 h-2" />
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Strengths */}
          <Card className="border-primary animate-fade-in" style={{ animationDelay: "0.1s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="text-primary" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.strengths.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.topic}</span>
                    <Badge variant="outline" className="bg-primary-light">
                      {item.score}%
                    </Badge>
                  </div>
                  <Progress value={item.score} className="h-2" />
                  <p className="text-sm text-muted-foreground">{item.questions} questions completed</p>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Weaknesses */}
          <Card className="border-accent animate-fade-in" style={{ animationDelay: "0.2s" }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="text-accent" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {data.weaknesses.map((item, idx) => (
                <div key={idx} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{item.topic}</span>
                    <Badge variant="outline" className="bg-accent-light border-accent">
                      {item.score}%
                    </Badge>
                  </div>
                  <Progress value={item.score} className="h-2" />
                  <p className="text-sm text-muted-foreground">{item.questions} questions attempted</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Recommendations */}
        <Card className="mt-6 border-2 border-primary animate-fade-in" style={{ animationDelay: "0.3s" }}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="text-primary" />
              Personalized Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {data.recommendations.map((rec, idx) => (
                <li key={idx} className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary-light flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-primary text-sm font-bold">{idx + 1}</span>
                  </div>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
            <Button variant="hero" className="w-full mt-6" onClick={() => navigate("/quiz")}>
              Start Practice Session
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
