import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Clock, BookOpen, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Assignment {
  title: string;
  dueDate: string;
  questions: number;
  subject: string;
  difficulty: "Easy" | "Medium" | "Hard";
  completed: boolean;
  score?: number;
}

interface PracticeAssignmentProps {
  assignments?: Assignment[];
  onStartAssignment?: (index: number) => void;
}

export const PracticeAssignment = ({ 
  assignments = [
    {
      title: "Algebra & Functions Review",
      dueDate: "Due in 2 days",
      questions: 20,
      subject: "SAT Math",
      difficulty: "Medium",
      completed: false,
    },
    {
      title: "Reading Comprehension Practice",
      dueDate: "Due in 5 days",
      questions: 15,
      subject: "SAT Reading",
      difficulty: "Hard",
      completed: false,
    },
    {
      title: "Grammar & Usage Quiz",
      dueDate: "Completed",
      questions: 18,
      subject: "SAT Writing",
      difficulty: "Easy",
      completed: true,
      score: 89,
    },
  ],
  onStartAssignment
}: PracticeAssignmentProps) => {
  const navigate = useNavigate();

  const handleStart = (index: number) => {
    if (onStartAssignment) {
      onStartAssignment(index);
    } else {
      navigate("/quiz");
    }
  };
  
  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
      case "Medium": return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "Hard": return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  return (
    <Card className="border-2">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Target className="text-primary" size={24} />
          Practice Assignments
        </CardTitle>
        <CardDescription>Complete assigned practice sets to improve your score</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {assignments.map((assignment, index) => (
          <div
            key={index}
            className={`p-4 border-2 rounded-lg transition-all ${
              assignment.completed 
                ? "bg-muted/50 border-border" 
                : "hover:border-primary hover:shadow-soft"
            }`}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="font-semibold text-lg mb-1">{assignment.title}</h4>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BookOpen size={14} />
                  <span>{assignment.subject}</span>
                  <span>•</span>
                  <Clock size={14} />
                  <span>{assignment.dueDate}</span>
                </div>
              </div>
              <Badge className={getDifficultyColor(assignment.difficulty)}>
                {assignment.difficulty}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">
                {assignment.questions} questions
                {assignment.completed && assignment.score && (
                  <span className="ml-2 font-semibold text-primary">
                    Score: {assignment.score}%
                  </span>
                )}
              </span>
              <Button
                variant={assignment.completed ? "outline" : "hero"}
                size="sm"
                onClick={() => handleStart(index)}
              >
                {assignment.completed ? "Review" : "Start"}
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
