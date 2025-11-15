import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Trophy, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  subject: string;
}


export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const subject = searchParams.get("subject");
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user) return;

      try {
        // Get student's class year
        const { data: studentData } = await supabase
          .from("students")
          .select("class_year")
          .eq("user_id", user.id)
          .maybeSingle();

        if (!studentData?.class_year) {
          toast.error("Unable to determine your class year");
          navigate("/dashboard/student");
          return;
        }

        // Determine which table to query
        const tableName = studentData.class_year === 'year_6' 
          ? 'quiz_questions_year6' 
          : 'quiz_questions_year9';

        const optionsTableName = studentData.class_year === 'year_6'
          ? 'quiz_options_year6'
          : 'quiz_options_year9';

        // Build query with subject filter if provided
        let query = supabase
          .from(tableName as any)
          .select("*");

        if (subject) {
          query = query.eq("subject", subject);
        }

        // Fetch all questions matching the criteria first
        const { data: allQuestions, error: questionsError } = await query;

        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
          toast.error("Failed to load questions");
          navigate("/dashboard/student");
          return;
        }

        if (!allQuestions || allQuestions.length === 0) {
          toast.error("No questions available for this subject");
          navigate("/dashboard/student");
          return;
        }

        // Randomly shuffle and select 10 questions
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        const questionsData = shuffled.slice(0, Math.min(10, shuffled.length));


        // Fetch options for each question
        const questionsWithOptions = await Promise.all(
          questionsData.map(async (q: any) => {
            const { data: optionsData } = await supabase
              .from(optionsTableName as any)
              .select("*")
              .eq("question_id", q.id)
              .order("display_order");

            const correctOptionIndex = optionsData?.findIndex((opt: any) => opt.is_correct) ?? 0;

            return {
              id: q.id,
              question: q.question_text,
              options: optionsData?.map((opt: any) => opt.option_text) || [],
              correctAnswer: correctOptionIndex,
              explanation: q.explanation || "No explanation available.",
              subject: q.subject,
            };
          })
        );

        setQuestions(questionsWithOptions);
      } catch (error) {
        console.error("Error:", error);
        toast.error("An error occurred while loading questions");
        navigate("/dashboard/student");
      } finally {
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [user, subject, navigate]);

  const question = questions[currentQuestion];
  const progress = questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleAnswerSelect = (index: number) => {
    if (!showFeedback) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;
    
    const isCorrect = selectedAnswer === question.correctAnswer;
    if (isCorrect) {
      setScore(score + 1);
    }
    setAnswers([...answers, isCorrect]);
    setShowFeedback(true);
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
    } else {
      saveQuizResults();
      setQuizComplete(true);
    }
  };

  const saveQuizResults = async () => {
    if (!user) return;

    try {
      // Get student ID
      const { data: studentData } = await supabase
        .from("students")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!studentData?.id) {
        console.error("Student ID not found");
        return;
      }

      const percentage = (score / questions.length) * 100;

      // Insert quiz result
      const { error } = await supabase
        .from("quiz_results")
        .insert({
          student_id: studentData.id,
          subject: subject || "Mixed Topics",
          score: percentage,
          total_questions: questions.length,
          correct_answers: score,
        });

      if (error) {
        console.error("Error saving quiz result:", error);
        toast.error("Failed to save quiz results");
      } else {
        toast.success("Quiz results saved! 🎉");
      }
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleRetry = () => {
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setQuizComplete(false);
    setAnswers([]);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (quizComplete) {
    const percentage = Math.round((score / questions.length) * 100);
    const isPassed = percentage >= 50;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-8 text-center animate-scale-in">
          <div className="mb-6">
            <Trophy className={`w-20 h-20 mx-auto mb-4 ${isPassed ? 'text-primary' : 'text-muted-foreground'}`} />
            <h1 className="text-3xl font-bold mb-2">Quiz Complete! 🎉</h1>
            <p className="text-muted-foreground">Here's how you performed</p>
          </div>

          <div className="bg-gradient-to-br from-primary/10 to-accent/10 rounded-lg p-8 mb-6">
            <div className="text-6xl font-bold text-primary mb-2">
              {score}/{questions.length}
            </div>
            <div className="text-2xl font-semibold mb-4">{percentage}% Correct</div>
            <Badge variant={isPassed ? "default" : "secondary"} className="text-lg px-4 py-1">
              {isPassed ? "Passed! ✨" : "Keep Practicing"}
            </Badge>
          </div>

          <div className="grid grid-cols-5 gap-2 mb-6">
            {answers.map((correct, index) => (
              <div
                key={index}
                className={`aspect-square rounded-lg flex items-center justify-center ${
                  correct ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
                }`}
              >
                {correct ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                )}
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Button onClick={handleRetry} variant="default" className="w-full" size="lg">
              Try Again
            </Button>
            <Button onClick={() => navigate("/dashboard/student")} variant="outline" className="w-full" size="lg">
              Back to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/dashboard/student")}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>
          
          <div className="flex justify-between items-center mb-2">
            <Badge variant="secondary">{subject || "Mixed Topics"}</Badge>
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

          <div className="space-y-3 mb-6">
            {question.options.map((option, index) => {
              const isSelected = selectedAnswer === index;
              const isCorrect = index === question.correctAnswer;
              const showCorrect = showFeedback && isCorrect;
              const showIncorrect = showFeedback && isSelected && !isCorrect;

              return (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={showFeedback}
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${
                    showCorrect
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                      : showIncorrect
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : isSelected
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{option}</span>
                    {showCorrect && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {showIncorrect && <XCircle className="w-5 h-5 text-red-600" />}
                  </div>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className={`p-4 rounded-lg mb-6 animate-fade-in ${
              selectedAnswer === question.correctAnswer
                ? 'bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800'
                : 'bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-3">
                {selectedAnswer === question.correctAnswer ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold mb-1">
                    {selectedAnswer === question.correctAnswer ? "Correct! 🎉" : "Incorrect"}
                  </p>
                  <p className="text-sm text-foreground/80">{question.explanation}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3">
            {!showFeedback ? (
              <Button
                onClick={handleSubmitAnswer}
                disabled={selectedAnswer === null}
                className="w-full"
                size="lg"
              >
                Submit Answer
              </Button>
            ) : (
              <Button onClick={handleNext} className="w-full" size="lg">
                {currentQuestion < questions.length - 1 ? (
                  <>
                    Next Question <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                ) : (
                  "View Results"
                )}
              </Button>
            )}
          </div>

          <div className="mt-6 pt-6 border-t flex justify-between text-sm text-muted-foreground">
            <span>Current Score: {score}/{currentQuestion + (showFeedback ? 1 : 0)}</span>
            <span>{Math.round((score / Math.max(currentQuestion + (showFeedback ? 1 : 0), 1)) * 100)}% Accuracy</span>
          </div>
        </Card>
      </div>
    </div>
  );
}
