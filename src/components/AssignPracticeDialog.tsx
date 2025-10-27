import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Clock, Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AssignPracticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  childName?: string;
}

export function AssignPracticeDialog({ open, onOpenChange, childName }: AssignPracticeDialogProps) {
  const navigate = useNavigate();
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState("");

  const quizzes = [
    {
      subject: "Mathematics",
      topic: "Algebraic Processes",
      difficulty: "Medium",
      questions: 20,
      duration: "25 min",
      color: "primary",
    },
    {
      subject: "English Language",
      topic: "Comprehension & Summary",
      difficulty: "Easy",
      questions: 15,
      duration: "20 min",
      color: "accent",
    },
    {
      subject: "Basic Science",
      topic: "Living Things",
      difficulty: "Hard",
      questions: 25,
      duration: "30 min",
      color: "primary",
    },
    {
      subject: "Social Studies",
      topic: "Nigerian History",
      difficulty: "Medium",
      questions: 20,
      duration: "25 min",
      color: "accent",
    },
    {
      subject: "Mathematics",
      topic: "Fractions & Decimals",
      difficulty: "Easy",
      questions: 15,
      duration: "20 min",
      color: "primary",
    },
    {
      subject: "Business Studies",
      topic: "Basic Accounting",
      difficulty: "Medium",
      questions: 18,
      duration: "22 min",
      color: "accent",
    },
  ];

  const filteredQuizzes = quizzes.filter(quiz => {
    const matchesSubject = !selectedSubject || quiz.subject === selectedSubject;
    const matchesDifficulty = !selectedDifficulty || quiz.difficulty === selectedDifficulty;
    return matchesSubject && matchesDifficulty;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            Assign Practice Quiz {childName && `for ${childName}`}
          </DialogTitle>
          <p className="text-muted-foreground">Select a quiz to assign based on subject and difficulty</p>
        </DialogHeader>

        {/* Filters */}
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Subject</label>
            <Select value={selectedSubject} onValueChange={setSelectedSubject}>
              <SelectTrigger>
                <SelectValue placeholder="All Subjects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                <SelectItem value="Mathematics">Mathematics</SelectItem>
                <SelectItem value="English Language">English Language</SelectItem>
                <SelectItem value="Basic Science">Basic Science</SelectItem>
                <SelectItem value="Social Studies">Social Studies</SelectItem>
                <SelectItem value="Business Studies">Business Studies</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Difficulty</label>
            <Select value={selectedDifficulty} onValueChange={setSelectedDifficulty}>
              <SelectTrigger>
                <SelectValue placeholder="All Levels" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="Easy">Easy</SelectItem>
                <SelectItem value="Medium">Medium</SelectItem>
                <SelectItem value="Hard">Hard</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quiz Cards */}
        <div className="grid md:grid-cols-2 gap-4">
          {filteredQuizzes.map((quiz, idx) => (
            <Card key={idx} className="hover:shadow-hover transition-all cursor-pointer border-2">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">{quiz.topic}</h3>
                    <p className="text-sm text-muted-foreground">{quiz.subject}</p>
                  </div>
                  <Badge 
                    variant={quiz.difficulty === "Hard" ? "default" : "outline"}
                    className={quiz.difficulty === "Medium" ? "bg-accent-light border-accent" : ""}
                  >
                    {quiz.difficulty}
                  </Badge>
                </div>
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <BookOpen size={16} className="text-primary" />
                    <span>{quiz.questions} questions</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock size={16} className="text-primary" />
                    <span>{quiz.duration}</span>
                  </div>
                </div>
                <Button 
                  variant="hero" 
                  className="w-full"
                  onClick={() => {
                    navigate("/quiz");
                    onOpenChange(false);
                  }}
                >
                  <Target size={16} />
                  Assign Quiz
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredQuizzes.length === 0 && (
          <div className="text-center py-8 text-muted-foreground">
            No quizzes match your filters. Try adjusting your selection.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
