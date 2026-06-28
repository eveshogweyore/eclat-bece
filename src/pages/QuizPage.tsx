import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Trophy, ArrowLeft, ArrowRight, Loader2, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuizOption {
  text: string;
  image_url?: string | null;
}

interface Question {
  id: string;
  question: string;
  options: QuizOption[];
  correctAnswer: number;
  explanation: string;
  subject: string;
  image_url?: string | null;
  passage?: {
    title: string | null;
    passage_text: string;
  } | null;
}


export default function QuizPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const subject = searchParams.get("subject");
  const topic = searchParams.get("topic");
  const assignmentId = searchParams.get("assignmentId");

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [quizSubject, setQuizSubject] = useState(subject || "Mixed Topics");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Question Flagging States
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [flagReason, setFlagReason] = useState("");
  const [flagDetails, setFlagDetails] = useState("");
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);
  const [submittingFlag, setSubmittingFlag] = useState(false);

  const handleFlagQuestion = async () => {
    if (!user || !question) return;
    if (!flagReason) {
      toast.error("Please select a reason for flagging.");
      return;
    }

    setSubmittingFlag(true);
    try {
      // 1. Get student ID and class year
      const { data: studentData } = await supabase
        .from("students")
        .select("id, class_year")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!studentData?.id) {
        toast.error("Student profile not found.");
        return;
      }

      // 2. Insert flag report
      const { error } = await supabase
        .from("flagged_questions")
        .insert({
          student_id: studentData.id,
          class_year: studentData.class_year,
          question_id: question.id,
          subject: question.subject,
          topic: topic || "Mixed Topics",
          question_text: question.question,
          reason: flagReason,
          details: flagDetails.trim() || null,
        });

      if (error) throw error;

      toast.success("Thank you! Question has been flagged for admin review. 🎉");
      setFlaggedQuestionIds(prev => [...prev, question.id]);
      setFlagDialogOpen(false);
      setFlagReason("");
      setFlagDetails("");
    } catch (err: any) {
      console.error("Error flagging question:", err);
      toast.error(err.message || "Failed to submit flag report.");
    } finally {
      setSubmittingFlag(false);
    }
  };

  useEffect(() => {
    const fetchQuestions = async () => {
      if (!user) return;

      try {
        let fetchSubject = subject;
        let fetchTopics: string[] = topic ? [topic] : [];
        let fetchLimit = 10;
        let classYear = '';

        // If assignmentId is present, fetch assignment details
        if (assignmentId) {
          const { data: assignment, error: assignError } = await supabase
            .from("practice_assignments")
            .select("subject, topics, num_questions, student:students(class_year)")
            .eq("id", assignmentId)
            .single();

          if (assignError || !assignment) {
            toast.error("Failed to load assignment details");
            navigate("/dashboard/student");
            return;
          }

          fetchSubject = assignment.subject;
          fetchTopics = assignment.topics;
          fetchLimit = assignment.num_questions;
          classYear = (assignment.student as any)?.class_year;
        }

        // If not assignment, get student's class year
        if (!classYear) {
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
          classYear = studentData.class_year;
        }

        // Determine which table to query
        const tableName = classYear === 'year_6'
          ? 'quiz_questions_year6'
          : 'quiz_questions_year9';

        const optionsTableName = classYear === 'year_6'
          ? 'quiz_options_year6'
          : 'quiz_options_year9';

        const passageTableName = classYear === 'year_6'
          ? 'comprehension_passages_year6'
          : 'comprehension_passages_year9';

        let query = supabase
          .from(tableName)
          .select(`
            *,
            passage:${passageTableName}(title, passage_text)
          `);

        if (fetchSubject) {
          query = query.eq("subject", fetchSubject);
        }

        if (fetchTopics && fetchTopics.length > 0) {
          query = query.in("topic", fetchTopics);
        }

        setQuizSubject(fetchSubject || "Mixed Topics");

        const { data: allQuestions, error: questionsError } = await query;

        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
          toast.error("Failed to load questions");
          navigate("/dashboard/student");
          return;
        }

        if (!allQuestions || allQuestions.length === 0) {
          toast.error("No questions available for this selection");
          navigate("/dashboard/student");
          return;
        }

        // Randomly shuffle and select questions based on limit
        const shuffled = [...allQuestions].sort(() => Math.random() - 0.5);
        const questionsData = shuffled.slice(0, Math.min(fetchLimit, shuffled.length));

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
              options: optionsData?.map((opt: any) => ({
                text: opt.option_text,
                image_url: opt.image_url || null
              })) || [],
              correctAnswer: correctOptionIndex,
              explanation: q.explanation || "No explanation available.",
              subject: q.subject,
              passage: q.passage || null,
              image_url: q.image_url || null,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, subject, topic, assignmentId, navigate]);

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
          subject: quizSubject || subject || "Mixed Topics",
          score: percentage,
          total_questions: questions.length,
          correct_answers: score,
        });

      if (error) {
        console.error("Error saving quiz result:", error);
        toast.error("Failed to save quiz results");
      } else {
        // If it was an assignment, update assignment status
        if (assignmentId) {
          await supabase
            .from("practice_assignments")
            .update({ 
               status: 'completed',
               score: percentage,
               completed_at: new Date().toISOString()
            })
            .eq("id", assignmentId);

          try {
            const { data: assignmentData } = await supabase
              .from("practice_assignments")
              .select("parent_id, subject")
              .eq("id", assignmentId)
              .single();

            if (assignmentData) {
              const { data: parentData } = await supabase
                .from("parents")
                .select("user_id")
                .eq("id", assignmentData.parent_id)
                .single();

              const { data: profileData } = await supabase
                .from("profiles")
                .select("full_name")
                .eq("id", user.id)
                .single();

              const studentName = profileData?.full_name || "Your child";

              if (parentData?.user_id) {
                await supabase
                  .from("notifications")
                  .insert({
                    user_id: parentData.user_id,
                    title: "Assignment Completed",
                    message: `${studentName} completed the assigned ${assignmentData.subject} practice task with a score of ${Math.round(percentage)}%.`,
                    type: "assignment_completed",
                    read: false,
                    metadata: {
                      assignment_id: assignmentId,
                      student_id: studentData.id,
                      score: percentage,
                    }
                  });
              }
            }
          } catch (notifErr) {
            console.error("Error creating assignment completion notification:", notifErr);
          }
        }
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
                className={`aspect-square rounded-lg flex items-center justify-center ${correct ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'
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
            <div className="flex items-center gap-2">
              <Badge variant="secondary">{quizSubject || subject || "Mixed Topics"}</Badge>
              {questions.length > 0 && question && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFlagDialogOpen(true)}
                  disabled={flaggedQuestionIds.includes(question.id)}
                  className={`h-7 px-2 text-xs flex items-center gap-1 ${
                    flaggedQuestionIds.includes(question.id)
                      ? "text-green-600 bg-green-50 dark:bg-green-950/20 hover:bg-green-50 dark:hover:bg-green-950/20"
                      : "text-muted-foreground hover:text-destructive hover:bg-destructive/5"
                  }`}
                >
                  <Flag className="h-3 w-3" />
                  {flaggedQuestionIds.includes(question.id) ? "Flagged" : "Flag"}
                </Button>
              )}
            </div>
            <span className="text-sm text-muted-foreground">
              Question {currentQuestion + 1} of {questions.length}
            </span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 animate-fade-in">
          {/* Passage Display (if present) */}
          {question.passage && (
            <div className="mb-6 p-4 bg-muted rounded-lg border">
              <h3 className="font-semibold mb-2 text-sm text-primary">Read the passage below:</h3>
              {question.passage.title && (
                <h4 className="font-medium mb-2">{question.passage.title}</h4>
              )}
              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                {question.passage.passage_text}
              </p>
            </div>
          )}

          <h2 className="text-2xl font-bold mb-6">{question.question}</h2>

          {/* Question Image (Optional) */}
          {question.image_url && (
            <div 
              className="mb-6 max-w-lg mx-auto rounded-2xl border bg-muted/10 overflow-hidden shadow-sm cursor-zoom-in hover:shadow-md transition-shadow"
              onClick={() => setLightboxImage(question.image_url || null)}
            >
              <img 
                src={question.image_url} 
                alt="Question diagram" 
                className="w-full max-h-[300px] object-contain mx-auto"
                loading="lazy"
              />
            </div>
          )}

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
                  className={`w-full p-4 text-left rounded-lg border-2 transition-all ${showCorrect
                    ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                    : showIncorrect
                      ? 'border-red-500 bg-red-50 dark:bg-red-900/20'
                      : isSelected
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50 hover:bg-muted/50'
                    } ${showFeedback ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  <div className="flex flex-col gap-3">
                    {option.image_url && (
                      <div className="max-h-24 sm:max-h-32 w-auto overflow-hidden rounded-md border bg-muted/10 self-start">
                        <img 
                          src={option.image_url} 
                          alt={`Option ${index + 1}`} 
                          className="max-h-24 sm:max-h-32 object-contain"
                          loading="lazy"
                        />
                      </div>
                    )}
                    <div className="flex items-center justify-between w-full">
                      <span className="font-medium">{option.text}</span>
                      {showCorrect && <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />}
                      {showIncorrect && <XCircle className="w-5 h-5 text-red-600 shrink-0" />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {showFeedback && (
            <div className={`p-4 rounded-lg mb-6 animate-fade-in ${selectedAnswer === question.correctAnswer
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

      {/* Flag Question Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="h-5 w-5 text-destructive" />
              Flag this Question
            </DialogTitle>
            <DialogDescription>
              Let us know what is wrong with this question. Our administrators will review it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="flag-reason">Reason</Label>
              <Select value={flagReason} onValueChange={setFlagReason}>
                <SelectTrigger id="flag-reason">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="incorrect_answer">Incorrect Correct Option</SelectItem>
                  <SelectItem value="typo">Spelling or Formatting Issue</SelectItem>
                  <SelectItem value="missing_image">Image Failed to Load / Wrong Image</SelectItem>
                  <SelectItem value="incomplete">Question or Options Truncated</SelectItem>
                  <SelectItem value="other">Other Issue</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="flag-details">Additional Details (Optional)</Label>
              <Textarea
                id="flag-details"
                placeholder="Explain the issue in detail..."
                value={flagDetails}
                onChange={(e) => setFlagDetails(e.target.value)}
                maxLength={500}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              type="button" 
              onClick={handleFlagQuestion} 
              disabled={submittingFlag || !flagReason}
            >
              {submittingFlag && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lightbox Overlay */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <img 
            src={lightboxImage} 
            alt="Enlarged diagram" 
            className="max-w-full max-h-[90vh] rounded-xl object-contain shadow-2xl border"
          />
        </div>
      )}
    </div>
  );
}
