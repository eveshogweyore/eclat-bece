import { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  XCircle,
  Trophy,
  ArrowLeft,
  ArrowRight,
  Loader2,
  Flag,
  RotateCcw,
  Sparkles,
  Eye,
  Clock,
  Swords,
  Lock,
  Flame,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { startQuizSession, submitQuizAnswer, completeQuizSession, abandonQuizSessionServer, isDailyChallengeError } from "@/services/quizSession";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { ThemeToggle } from "@/components/ThemeToggle";
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
import { QuestionSnapshotDialog } from "@/components/quiz/QuestionSnapshotDialog";
import { PointBreakdownLedger } from "@/components/gamification/PointBreakdownLedger";
import { BadgeUnlockModal } from "@/components/gamification/BadgeUnlockModal";
import { submitDuelTurn } from "@/services/gamification/arenaService";
import { GamificationSessionOutcome } from "@/services/gamification/gamificationService";
import { DifficultyLevel } from "@/services/gamification/types";
import { BadgeDefinition } from "@/services/gamification/badgeEngine";
import { getDailyChallengeCountdown } from "@/services/gamification/dailyChallengeEngine";

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
  difficulty?: DifficultyLevel;
  topic?: string;
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
  const isReviewMode = searchParams.get("review") === "true";
  const isDailyChallenge = searchParams.get("mode") === "daily_challenge";
  const duelId = searchParams.get("duelId");
  const isDuel = searchParams.get("mode") === "duel" || Boolean(duelId);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [duelOutcome, setDuelOutcome] = useState<{ isMatchComplete: boolean; matchResult?: any } | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showFeedback, setShowFeedback] = useState(false);
  const [score, setScore] = useState(0);
  const [quizComplete, setQuizComplete] = useState(false);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [userResponses, setUserResponses] = useState<(number | null)[]>([]);
  const [quizSubject, setQuizSubject] = useState(subject || "Mixed Topics");
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Assignment Time Limit State
  const [assignmentDuration, setAssignmentDuration] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);

  // Question Snapshot Review Dialog States
  const [snapshotDialogOpen, setSnapshotDialogOpen] = useState(false);
  const [snapshotInitialIndex, setSnapshotInitialIndex] = useState(0);

  // Gamification State
  const [gamificationOutcome, setGamificationOutcome] = useState<GamificationSessionOutcome | null>(null);
  const [badgeModalOpen, setBadgeModalOpen] = useState(false);
  const [unlockedBadges, setUnlockedBadges] = useState<BadgeDefinition[]>([]);

  // Daily Challenge Hard Lock State
  const [dailyChallengeLocked, setDailyChallengeLocked] = useState(false);
  const [dailyChallengeCountdown, setDailyChallengeCountdown] = useState<string>("");

  // Server-authoritative session state
  const [quizSessionId, setQuizSessionId] = useState<string | null>(null);
  const [grading, setGrading] = useState(false);
  const gradingRef = useRef(false);
  const questionStartRef = useRef<number>(Date.now());

  useEffect(() => {
    if (!isDailyChallenge) return;
    const updateCountdown = () => {
      const cd = getDailyChallengeCountdown();
      setDailyChallengeCountdown(cd.formattedCountdown);
    };
    updateCountdown();
    const interval = setInterval(updateCountdown, 30000);
    return () => clearInterval(interval);
  }, [isDailyChallenge]);

  // Question Flagging States
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [questionToFlag, setQuestionToFlag] = useState<Question | null>(null);
  const [flagReason, setFlagReason] = useState("");
  const [flagDetails, setFlagDetails] = useState("");
  const [flaggedQuestionIds, setFlaggedQuestionIds] = useState<string[]>([]);
  const [submittingFlag, setSubmittingFlag] = useState(false);

  // Keep a ref to latest state for auto-submit on timeout
  const latestQuizState = useRef({
    currentQuestion,
    selectedAnswer,
    score,
    answers,
    userResponses,
    questions,
    assignmentDuration,
  });

  useEffect(() => {
    latestQuizState.current = {
      currentQuestion,
      selectedAnswer,
      score,
      answers,
      userResponses,
      questions,
      assignmentDuration,
    };
  }, [currentQuestion, selectedAnswer, score, answers, userResponses, questions, assignmentDuration]);

  const getSessionCacheKey = useCallback(() => {
    if (!user) return null;
    if (isDailyChallenge) {
      const todayUTC = new Date().toISOString().split("T")[0];
      return `eclat_daily_challenge_${user.id}_${todayUTC}`;
    }
    if (isDuel && duelId) {
      // Duels must never share a cache key with each other or with mixed
      // practice — a shared key could restore one duel's session and submit
      // its answers to another duel.
      return `eclat_quiz_cache_${user.id}_duel_${duelId}`;
    }
    return `eclat_quiz_cache_${user.id}_${assignmentId || subject || "mixed"}_${topic || "all"}`;
  }, [user, assignmentId, subject, topic, isDailyChallenge, isDuel, duelId]);

  const clearSessionCache = useCallback(() => {
    const key = getSessionCacheKey();
    if (key) {
      try {
        sessionStorage.removeItem(key);
      } catch (e) {
        // ignore
      }
    }
  }, [getSessionCacheKey]);

  const handleOpenFlagDialog = (q?: Question) => {
    const targetQ = q || questions[currentQuestion] || null;
    setQuestionToFlag(targetQ);
    setFlagReason("");
    setFlagDetails("");
    setFlagDialogOpen(true);
  };

  const handleFlagQuestion = async () => {
    const targetQ = questionToFlag || questions[currentQuestion];
    if (!user || !targetQ) return;
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
          question_id: targetQ.id,
          subject: targetQ.subject,
          topic: topic || "Mixed Topics",
          question_text: targetQ.question,
          reason: flagReason,
          details: flagDetails.trim() || null,
        });

      if (error) throw error;

      toast.success("Thank you! Question has been flagged for admin review. 🎉");
      setFlaggedQuestionIds((prev) => [...prev, targetQ.id]);
      setFlagDialogOpen(false);
      setFlagReason("");
      setFlagDetails("");
      setQuestionToFlag(null);
    } catch (err: any) {
      console.error("Error flagging question:", err);
      toast.error(err.message || "Failed to submit flag report.");
    } finally {
      setSubmittingFlag(false);
    }
  };

  const fetchQuestions = useCallback(
    async (forceFresh = false) => {
      if (!user) return;
      setLoading(true);

      try {
        // Pre-flight check: Enforce Daily Challenge single-attempt lock
        if (isDailyChallenge) {
          const { data: studentRecord } = await supabase
            .from("students")
            .select("id, class_year")
            .eq("user_id", user.id)
            .maybeSingle();

          if (studentRecord?.id) {
            const todayUTC = new Date().toISOString().split("T")[0];
            const todayStart = `${todayUTC}T00:00:00.000Z`;
            let alreadyCompletedToday = false;

            // Primary check: gamification profile date stamp
            const { data: gameProfile } = await supabase
              .from("student_gamification_profile")
              .select("last_daily_challenge_date")
              .eq("student_id", studentRecord.id)
              .maybeSingle();

            if (gameProfile?.last_daily_challenge_date === todayUTC) {
              alreadyCompletedToday = true;
            }

            // Fallback 1: points ledger for daily_challenge entries today
            if (!alreadyCompletedToday) {
              const { data: todayLedger } = await supabase
                .from("student_points_ledger")
                .select("id")
                .eq("student_id", studentRecord.id)
                .eq("source_type", "daily_challenge")
                .gte("created_at", todayStart)
                .limit(1);

              if (todayLedger && todayLedger.length > 0) {
                alreadyCompletedToday = true;
              }
            }

            // Fallback 2: quiz_results for Daily Challenge completions today
            if (!alreadyCompletedToday) {
              const { data: todayDailyResults } = await supabase
                .from("quiz_results")
                .select("id")
                .eq("student_id", studentRecord.id)
                .eq("subject", "Daily Challenge")
                .gte("completed_at", todayStart)
                .limit(1);

              if (todayDailyResults && todayDailyResults.length > 0) {
                alreadyCompletedToday = true;
              }
            }

            if (alreadyCompletedToday) {
              // Ensure gamification profile has date recorded
              await supabase.from("student_gamification_profile")
                .update({ last_daily_challenge_date: todayUTC })
                .eq("student_id", studentRecord.id);

              clearSessionCache();
              const countdown = getDailyChallengeCountdown();
              setDailyChallengeLocked(true);
              setDailyChallengeCountdown(countdown.formattedCountdown);
              setLoading(false);
              return;
            }
          }
        }

        let fetchSubject = isDailyChallenge ? null : subject;
        let fetchTopics: string[] = isDailyChallenge || !topic ? [] : [topic];
        let fetchLimit = 10;
        let classYear = "";

        // If assignmentId is present, fetch assignment details including duration and past snapshot
        if (assignmentId) {
          const { data: assignment, error: assignError } = await supabase
            .from("practice_assignments")
            .select("subject, topics, num_questions, duration, questions_snapshot, status, student:students(class_year)")
            .eq("id", assignmentId)
            .single();

          if (assignError || !assignment) {
            toast.error("Failed to load assignment details");
            navigate("/dashboard/student");
            return;
          }

          if (assignment.duration) {
            setAssignmentDuration(assignment.duration);
            if (!isReviewMode) {
              setTimeLeft(assignment.duration * 60);
            }
          }

          // If in review mode and snapshot exists, open directly in review mode
          if (isReviewMode && assignment.questions_snapshot) {
            const snap = assignment.questions_snapshot as unknown as {
              questions?: Array<Record<string, any>>;
              answers?: (boolean | null)[];
              userResponses?: (number | null)[];
            };
            if (snap.questions && snap.questions.length > 0) {
              const sortedQuestions = [...snap.questions].sort((a: any, b: any) => {
                const orderA = a.question_number ?? a.original_order ?? 0;
                const orderB = b.question_number ?? b.original_order ?? 0;
                return orderA - orderB;
              });

              const sortedAnswers = sortedQuestions.map((q: any, i: number) =>
                q.isCorrect !== undefined ? q.isCorrect : (snap.answers?.[i] ?? false)
              );
              const sortedResponses = sortedQuestions.map((q: any, i: number) =>
                q.userResponse !== undefined ? q.userResponse : (snap.userResponses?.[i] ?? null)
              );

              setQuestions(sortedQuestions as unknown as Question[]);
              setUserResponses(sortedResponses);
              setAnswers(sortedAnswers);
              setScore(sortedAnswers.filter(Boolean).length);
              setQuizSubject(assignment.subject || "Practice Assignment");
              setQuizComplete(true);
              setLoading(false);
              return;
            }
          }

          fetchSubject = assignment.subject;
          fetchTopics = assignment.topics;
          fetchLimit = assignment.num_questions;
          classYear = (assignment.student as { class_year?: string } | null)?.class_year || "";
        }

        // If duel challenge, fetch duel details and question IDs
        let duelQuestionIds: string[] = [];
        if (duelId) {
          const { data: duelData } = await supabase
            .from("arena_challenges")
            .select("subject, topic, max_time_seconds, question_ids")
            .eq("id", duelId)
            .maybeSingle();

          if (duelData) {
            fetchSubject = duelData.subject;
            setQuizSubject(`Duel: ${duelData.subject}`);
            if (duelData.max_time_seconds) {
              const mins = Math.max(1, Math.round(duelData.max_time_seconds / 60));
              setAssignmentDuration(mins);
              setTimeLeft(duelData.max_time_seconds);
            }
            if (Array.isArray(duelData.question_ids) && duelData.question_ids.length > 0) {
              duelQuestionIds = duelData.question_ids;
              fetchLimit = duelData.question_ids.length;
            }
          }
        }

        const cacheKey = getSessionCacheKey();

        // Check session storage cache unless forced fresh
        if (!forceFresh && cacheKey) {
          try {
            const cached = sessionStorage.getItem(cacheKey);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0 && parsed.sessionId) {
                setQuestions(parsed.questions);
                setQuizSessionId(parsed.sessionId);
                setQuizSubject(parsed.questions[0]?.subject || subject || "Mixed Topics");
                setLoading(false);
                questionStartRef.current = Date.now();
                return;
              }
            }
          } catch (cacheErr) {
            console.warn("Could not read quiz cache from sessionStorage:", cacheErr);
          }
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
        const tableName =
          classYear === "year_6"
            ? "quiz_questions_year6"
            : "quiz_questions_year9";

        const optionsTableName =
          classYear === "year_6"
            ? "quiz_options_year6"
            : "quiz_options_year9";

        const passageTableName =
          classYear === "year_6"
            ? "comprehension_passages_year6"
            : "comprehension_passages_year9";

        // IDs only — correct answers must never reach the browser.
        let idQuery = supabase.from(tableName).select("id");

        if (duelQuestionIds.length > 0) {
          idQuery = idQuery.in("id", duelQuestionIds);
        } else {
          if (fetchSubject) {
            idQuery = idQuery.eq("subject", fetchSubject);
          }

          if (fetchTopics && fetchTopics.length > 0) {
            idQuery = idQuery.in("topic", fetchTopics);
          }
        }

        setQuizSubject(fetchSubject || "Mixed Topics");

        const { data: allQuestionIds, error: questionsError } = await idQuery;

        if (questionsError) {
          console.error("Error fetching questions:", questionsError);
          toast.error("Failed to load questions");
          navigate("/dashboard/student");
          return;
        }

        if (!allQuestionIds || allQuestionIds.length === 0) {
          toast.error("No questions available for this selection");
          navigate("/dashboard/student");
          return;
        }

        // Randomly shuffle and select questions based on limit
        const shuffled = [...allQuestionIds].sort(() => Math.random() - 0.5);
        const selectedIds = shuffled
          .slice(0, Math.min(fetchLimit, shuffled.length))
          .map((q: any) => q.id);

        // Open a server-authoritative session. This also enforces the
        // daily-challenge lock server-side.
        let sessionId: string;
        try {
          sessionId = await startQuizSession({
            mode: isDailyChallenge ? "daily_challenge" : isDuel ? "duel" : "practice",
            questionIds: selectedIds,
            subject: isDailyChallenge ? "Daily Challenge" : (fetchSubject || subject || null),
            topic: isDailyChallenge ? "Daily Sprint" : (topic || null),
            assignmentId: assignmentId || null,
            arenaChallengeId: duelId || null,
          });
        } catch (sessionErr) {
          if (isDailyChallengeError(sessionErr)) {
            setDailyChallengeLocked(true);
            const cd = getDailyChallengeCountdown();
            setDailyChallengeCountdown(cd.formattedCountdown);
            setLoading(false);
            return;
          }
          throw sessionErr;
        }
        setQuizSessionId(sessionId);

        // Fetch sanitized question content (no correct answers) + options
        // without is_correct flags.
        const { data: questionsContent, error: contentError } = await supabase
          .from(tableName)
          .select(`
            id,
            subject,
            topic,
            question_text,
            explanation,
            difficulty,
            image_url,
            passage:${passageTableName}(title, passage_text)
          `)
          .in("id", selectedIds);

        if (contentError) {
          console.error("Error fetching question content:", contentError);
          toast.error("Failed to load questions");
          navigate("/dashboard/student");
          return;
        }

        const { data: allOptionsData, error: optionsError } = await supabase
          .from(optionsTableName)
          .select("id, question_id, option_text, display_order, image_url")
          .in("question_id", selectedIds)
          .order("display_order");

        if (optionsError) {
          console.error("Error fetching options:", optionsError);
        }

        const optionsByQuestion = (allOptionsData || []).reduce(
          (acc: Record<string, any[]>, opt: any) => {
            if (!acc[opt.question_id]) {
              acc[opt.question_id] = [];
            }
            acc[opt.question_id].push(opt);
            return acc;
          },
          {}
        );

        const questionsWithOptions: Question[] = (questionsContent || []).map((q: any) => {
          const optionsData = optionsByQuestion[q.id] || [];

          return {
            id: q.id,
            question: q.question_text,
            options: optionsData.map((opt: any) => ({
              text: opt.option_text,
              image_url: opt.image_url || null,
            })),
            // Server-graded: correctAnswer is filled in per answer from the
            // grading RPC / completion answer key, never fetched up front.
            correctAnswer: -1,
            explanation: q.explanation || "No explanation available.",
            subject: q.subject,
            topic: q.topic || undefined,
            difficulty: (q.difficulty as Question["difficulty"]) || "medium",
            passage: q.passage || null,
            image_url: q.image_url || null,
          };
        });

        setQuestions(questionsWithOptions);
        questionStartRef.current = Date.now();

        // Cache the sanitized session (no answers present) so retakes / page
        // reloads preserve test progress.
        if (cacheKey) {
          try {
            sessionStorage.setItem(cacheKey, JSON.stringify({ sessionId, questions: questionsWithOptions }));
          } catch (cacheErr) {
            console.warn("Could not cache quiz session:", cacheErr);
          }
        }
      } catch (error) {
        console.error("Error:", error);
        toast.error("An error occurred while loading questions");
        navigate("/dashboard/student");
      } finally {
        setLoading(false);
      }
    },
    [user, subject, topic, assignmentId, navigate, isReviewMode, isDailyChallenge, isDuel, duelId, getSessionCacheKey, clearSessionCache]
  );

  useEffect(() => {
    fetchQuestions(false);
  }, [fetchQuestions]);

  // Countdown timer effect
  useEffect(() => {
    if (timeLeft === null || quizComplete || loading) return;

    if (timeLeft <= 0) {
      toast.warning("Time has expired! Submitting your answers now...", {
        duration: 4000,
      });
      handleTimeExpired();
      return;
    }

    const interval = setInterval(() => {
      setTimeLeft((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);

    return () => clearInterval(interval);
  }, [timeLeft, quizComplete, loading]);

  const handleTimeExpired = async () => {
    // Guard against racing an in-flight submit_quiz_answer: if one is grading,
    // retry shortly — the countdown stays at 0 so this re-fires.
    if (gradingRef.current) {
      setTimeout(() => {
        if (!quizComplete) void handleTimeExpired();
      }, 600);
      return;
    }
    const state = latestQuizState.current;
    const finalAnswers = [...state.answers];
    const finalResponses = [...state.userResponses];
    let finalScore = state.score;

    // If student selected an answer on the current question but hasn't submitted yet:
    // grade it server-side so the timeout path is also server-authoritative.
    if (state.selectedAnswer !== null && state.questions[state.currentQuestion] && quizSessionId) {
      const q = state.questions[state.currentQuestion];
      try {
        const res = await submitQuizAnswer(quizSessionId, q.id, state.selectedAnswer, Date.now() - questionStartRef.current);
        if (res.is_correct) finalScore += 1;
        finalAnswers.push(res.is_correct);
      } catch (gradeErr) {
        console.warn("Timeout grading failed, counting as incorrect:", gradeErr);
        finalAnswers.push(false);
      }
      finalResponses.push(state.selectedAnswer);
    }

    // Pad remaining unanswered questions with null / false
    while (finalAnswers.length < state.questions.length) {
      finalAnswers.push(false);
      finalResponses.push(null);
    }

    setAnswers(finalAnswers);
    setUserResponses(finalResponses);
    setScore(finalScore);
    setQuizComplete(true);

    await saveQuizResults(finalScore, finalAnswers, finalResponses);
  };

  const question = questions[currentQuestion];
  const progress =
    questions.length > 0 ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleAnswerSelect = (index: number) => {
    if (!showFeedback) {
      setSelectedAnswer(index);
    }
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null || grading) return;
    if (!quizSessionId) {
      toast.error("Quiz session is not active. Please restart the quiz.");
      return;
    }

    const question = questions[currentQuestion];
    if (!question) return;

    setGrading(true);
    gradingRef.current = true;
    try {
      const timeSpentMs = Date.now() - questionStartRef.current;
      const result = await submitQuizAnswer(quizSessionId, question.id, selectedAnswer, timeSpentMs);

      // Update the local question with the server-provided answer key so the
      // review snapshot can be built without answers ever being pre-fetched.
      setQuestions((prev) =>
        prev.map((q, idx) =>
          idx === currentQuestion
            ? { ...q, correctAnswer: result.correct_index ?? -1 }
            : q
        )
      );

      if (result.is_correct) {
        setScore((prev) => prev + 1);
      }
      setAnswers((prev) => [...prev, result.is_correct]);
      setUserResponses((prev) => [...prev, selectedAnswer]);
      setShowFeedback(true);
    } catch (err) {
      console.error("Error submitting answer:", err);
      toast.error("Could not save your answer. Please try again.");
    } finally {
      setGrading(false);
      gradingRef.current = false;
    }
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
      setShowFeedback(false);
      questionStartRef.current = Date.now();
    } else {
      saveQuizResults();
      setQuizComplete(true);
    }
  };

  const saveQuizResults = async (
    overrideScore?: number,
    overrideAnswers?: boolean[],
    overrideResponses?: (number | null)[]
  ) => {
    if (!user) return;
    if (!quizSessionId) {
      console.error("No active quiz session");
      return;
    }

    const finalAnswers = overrideAnswers || answers;
    const finalResponses = overrideResponses || userResponses;
    const finalScore = overrideScore !== undefined ? overrideScore : finalAnswers.filter(Boolean).length;    const percentage = questions.length > 0 ? Math.round((finalScore / questions.length) * 100) : 0;

    try {
      // Server-authoritative completion: the edge function grades the recorded
      // answers, writes quiz_results, runs the EP/mastery/streak/badge
      // pipeline and updates the league cohort. The client no longer computes
      // or writes any gamification data.
      const answerKey: Record<string, { is_correct: boolean; correct_index: number | null }> = {};
      try {
        const outcome = await completeQuizSession(quizSessionId);
        for (const entry of outcome.questionAnswerKey ?? []) {
          answerKey[entry.question_id] = {
            is_correct: entry.is_correct,
            correct_index: entry.correct_index,
          };
        }
        // Reflect the server-provided answer key in the local questions so the
        // review snapshot is complete even for unanswered questions.
        setQuestions((prev) =>
          prev.map((q) =>
            answerKey[q.id]
              ? { ...q, correctAnswer: answerKey[q.id].correct_index ?? -1 }
              : q
          )
        );

        setGamificationOutcome(outcome);
        if (outcome.unlockedBadges && outcome.unlockedBadges.length > 0) {
          setUnlockedBadges(outcome.unlockedBadges);
          setBadgeModalOpen(true);
        }

        if (isDailyChallenge) {
          clearSessionCache();
          const cd = getDailyChallengeCountdown();
          setDailyChallengeCountdown(cd.formattedCountdown);
        }
      } catch (gameErr) {
        console.error("Error completing quiz session:", gameErr);
        toast.error("Your session was saved but scoring failed. Please contact support if points are missing.");
      }

      // If Head-to-Head Duel, submit turn to the arena (server-resolved from
      // this session's recorded answers)
      if (duelId && quizSessionId) {
        try {
          const res = await submitDuelTurn({
            challengeId: duelId,
            sessionId: quizSessionId,
          });
          setDuelOutcome(res);
        } catch (dErr) {
          console.warn("Error submitting duel turn:", dErr);
        }
      }

      // If it was an assignment, store the review snapshot. Status/score/
      // completion are written server-side; the snapshot is display data.
      if (assignmentId) {
        const questionsSnapshot = {
          questions: questions.map((q, idx) => ({
            id: q.id,
            question_number: idx + 1,
            original_order: idx + 1,
            question: q.question,
            options: q.options,
            correctAnswer: answerKey[q.id]?.correct_index ?? q.correctAnswer,
            userResponse: finalResponses[idx] !== undefined ? finalResponses[idx] : null,
            isCorrect: finalAnswers[idx] !== undefined ? finalAnswers[idx] : false,
            explanation: q.explanation,
            subject: q.subject,
            image_url: q.image_url || null,
            passage: q.passage || null,
          })),
          userResponses: finalResponses,
          answers: finalAnswers,
          score: percentage,
          totalQuestions: questions.length,
          durationMinutes: assignmentDuration,
          completedAt: new Date().toISOString(),
        };

        await supabase
          .from("practice_assignments")
          .update({
            questions_snapshot: questionsSnapshot as unknown as Database["public"]["Tables"]["practice_assignments"]["Insert"]["questions_snapshot"],
          })
          .eq("id", assignmentId);
      }

      clearSessionCache();
      toast.success("Quiz results saved! 🎉");
    } catch (error) {
      console.error("Error:", error);
    }
  };

  const handleRetrySameQuestions = async () => {
    if (isDailyChallenge) {
      toast.error("Daily Challenge can only be completed once per day.");
      return;
    }
    // Retry replays the same questions in a NEW server session so scoring
    // stays server-authoritative.
    try {
      const newSessionId = await startQuizSession({
        mode: "practice",
        questionIds: questions.map((q) => q.id),
        subject: quizSubject || subject || null,
        topic: topic || null,
        assignmentId: assignmentId || null,
      });
      setQuizSessionId(newSessionId);
    } catch (err) {
      console.error("Could not restart quiz session:", err);
      toast.error("Could not restart the quiz. Please try again.");
      return;
    }
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setQuizComplete(false);
    setAnswers([]);
    setUserResponses([]);
    questionStartRef.current = Date.now();
    if (assignmentDuration) {
      setTimeLeft(assignmentDuration * 60);
    }
  };

  const handlePracticeNewQuestions = () => {
    if (isDailyChallenge) {
      toast.error("Daily Challenge can only be completed once per day.");
      return;
    }
    // The old session is orphaned by the cache clear — mark it abandoned.
    if (quizSessionId && !quizComplete) {
      void abandonQuizSessionServer(quizSessionId);
    }
    clearSessionCache();
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setShowFeedback(false);
    setScore(0);
    setQuizComplete(false);
    setAnswers([]);
    setUserResponses([]);
    fetchQuestions(true);
  };

  const handleBackToDashboard = () => {
    // Cache clear already disables resume; abandon the server session too so
    // quitting mid-quiz doesn't leave it "in progress" forever.
    if (quizSessionId && !quizComplete && !isReviewMode) {
      void abandonQuizSessionServer(quizSessionId);
    }
    clearSessionCache();
    navigate("/dashboard/student");
  };

  // Shared flag dialog — previously duplicated in both render branches.
  const flagDialog = (
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
  );

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

  // Daily Challenge Already Completed Gate
  if (dailyChallengeLocked) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-xl p-6 sm:p-8 text-center animate-scale-in shadow-2xl border-amber-500/30 bg-gradient-to-b from-card via-card to-card/95">
          <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-transparent shadow-lg shadow-amber-500/10">
            <Lock className="h-10 w-10 text-amber-400" />
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-emerald-500/30 bg-emerald-500/15 text-emerald-400 text-xs font-bold mb-3 uppercase tracking-wider">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Today&apos;s Challenge Completed
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-2 text-foreground">
            Daily Challenge Locked
          </h1>
          <p className="text-muted-foreground text-sm max-w-md mx-auto mb-6 leading-relaxed">
            You&apos;ve already completed your official Daily Challenge for today and claimed your rewards. Daily challenges are limited to a single attempt per day.
          </p>

          <div className="mb-6 rounded-xl border border-border/80 bg-muted/40 p-4 max-w-sm mx-auto">
            <div className="flex items-center justify-center gap-2 text-xs font-semibold text-muted-foreground mb-1">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>NEXT SPRINT UNLOCKS IN</span>
            </div>
            <div className="text-2xl font-black font-mono tracking-wider text-amber-400">
              {dailyChallengeCountdown || getDailyChallengeCountdown().formattedCountdown}
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">Resets at 00:00 UTC</p>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => navigate("/dashboard/student/practice")}
                className="w-full gap-2 font-bold h-11 bg-primary text-primary-foreground shadow-md"
                size="lg"
              >
                <Sparkles className="w-4 h-4" />
                Practice by Topic
              </Button>
              <Button
                onClick={() => navigate("/dashboard/student/arena")}
                variant="outline"
                className="w-full gap-2 font-bold h-11 border-purple-500/40 text-purple-400 hover:bg-purple-950/30"
                size="lg"
              >
                <Swords className="w-4 h-4 text-purple-400" />
                Duel of Minds
              </Button>
            </div>
            <Button
              onClick={() => navigate("/dashboard/student")}
              variant="ghost"
              className="w-full font-semibold h-11"
              size="lg"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Return to Dashboard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Quiz Complete View
  if (quizComplete) {
    const percentage = questions.length > 0 ? Math.round((score / questions.length) * 100) : 0;
    const isPassed = percentage >= 50;

    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl p-6 sm:p-8 text-center animate-scale-in shadow-xl border-border/80">
          <div className="mb-6">
            <Trophy
              className={`w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-3 ${
                isPassed ? "text-primary" : "text-muted-foreground"
              }`}
            />
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mb-1">
              Quiz Complete! 🎉
            </h1>
            <p className="text-sm text-muted-foreground">
              Here is how you performed on this practice set
            </p>
          </div>

          <div className="bg-gradient-to-br from-primary/10 via-primary/5 to-accent/10 rounded-2xl p-6 mb-6 border border-primary/20 shadow-inner">
            <div className="text-5xl sm:text-6xl font-black text-primary mb-1">
              {score}/{questions.length}
            </div>
            <div className="text-xl sm:text-2xl font-bold mb-3">
              {percentage}% Correct
            </div>
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Badge
                variant={isPassed ? "default" : "secondary"}
                className="text-sm sm:text-base font-semibold px-4 py-1 rounded-full shadow-sm"
              >
                {isPassed ? "Passed! ✨" : "Keep Practicing"}
              </Badge>
              {assignmentDuration && (
                <Badge
                  variant="outline"
                  className="text-xs sm:text-sm font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 border-primary/30 bg-background/50"
                >
                  <Clock className="w-3.5 h-3.5 text-primary" />
                  <span>{assignmentDuration} Min Limit</span>
                </Badge>
              )}
            </div>
          </div>

          {/* Head-to-Head Arena Result Banner */}
          {duelOutcome && (
            <div className="mb-6 p-5 rounded-xl border border-purple-500/40 bg-gradient-to-r from-purple-500/20 via-[#18112c] to-[#0e192b] text-left">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/40">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {duelOutcome.isMatchComplete && duelOutcome.matchResult
                      ? duelOutcome.matchResult.outcome === "win"
                        ? "Arena Victory! 🏆"
                        : duelOutcome.matchResult.outcome === "draw"
                        ? "Arena Battle Tie! 🤝"
                        : "Arena Battle Concluded 🛡️"
                      : "Duel Round Recorded! ⚡"}
                  </h3>
                  <p className="text-xs text-slate-300">
                    {duelOutcome.isMatchComplete && duelOutcome.matchResult
                      ? duelOutcome.matchResult.isUpset
                        ? `Upset Victory! You took down a higher-ranked opponent and claimed +${duelOutcome.matchResult.totalEP} EP!`
                        : `Battle completed! You earned +${duelOutcome.matchResult.totalEP} EP in the Head-to-Head Arena.`
                      : "Your score and completion time are locked in. Awaiting your opponent's round in the Arena Hub."}
                  </p>
                </div>
              </div>
              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => navigate("/dashboard/student/duel-of-minds")}
                  className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs h-8"
                >
                  Return to Arena Hub →
                </Button>
              </div>
            </div>
          )}

          {/* Éclat Gamification Points Ledger */}
          {gamificationOutcome && (
            <div className="mb-6">
              <PointBreakdownLedger outcome={gamificationOutcome} />
            </div>
          )}

          {/* Interactive Question Grid with prompt */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <span className="text-xs sm:text-sm font-bold text-foreground flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" />
                Snapshot Review
              </span>
              <span className="text-xs text-muted-foreground flex items-center gap-1">
                <Eye className="w-3.5 h-3.5" /> Click any box to inspect question
              </span>
            </div>

            <div className="grid grid-cols-5 gap-2 sm:gap-2.5">
              {answers.map((correct, index) => (
                <button
                  key={index}
                  type="button"
                  onClick={() => {
                    setSnapshotInitialIndex(index);
                    setSnapshotDialogOpen(true);
                  }}
                  className={`group relative aspect-square rounded-xl flex flex-col items-center justify-center gap-1 border-2 transition-all cursor-pointer shadow-sm hover:scale-105 active:scale-95 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                    correct
                      ? "bg-emerald-50 hover:bg-emerald-100/90 border-emerald-300 dark:bg-emerald-950/30 dark:hover:bg-emerald-950/60 dark:border-emerald-800"
                      : "bg-rose-50 hover:bg-rose-100/90 border-rose-300 dark:bg-rose-950/30 dark:hover:bg-rose-950/60 dark:border-rose-800"
                  }`}
                  aria-label={`View Question ${index + 1} snapshot (${correct ? "Correct" : "Incorrect"})`}
                  title={`Click to review Question ${index + 1}`}
                >
                  <span
                    className={`text-[11px] sm:text-xs font-black ${
                      correct
                        ? "text-emerald-700 dark:text-emerald-300"
                        : "text-rose-700 dark:text-rose-300"
                    }`}
                  >
                    Q{index + 1}
                  </span>
                  {correct ? (
                    <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  ) : (
                    <XCircle className="w-5 h-5 sm:w-6 sm:h-6 text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform" />
                  )}
                  <span className="text-[10px] text-muted-foreground/80 font-medium group-hover:text-foreground">
                    Review
                  </span>
                </button>
              ))}
            </div>
          </div>

          {isDailyChallenge ? (
            <div className="space-y-4">
              <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900 to-amber-500/5 p-4 text-left">
                <div className="flex items-center gap-2 mb-1.5">
                  <Flame className="h-5 w-5 text-amber-400" />
                  <span className="text-sm font-bold text-amber-300">Daily Challenge Completed • Single Attempt Locked</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  Congratulations on finishing today&apos;s sprint! Daily challenges can only be attempted once per calendar day to maintain fair competitive standards and league rankings.
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-xs font-semibold text-amber-200/90">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  <span>Next challenge unlocks in: <span className="font-mono text-amber-300 font-bold">{dailyChallengeCountdown || getDailyChallengeCountdown().formattedCountdown}</span> (00:00 UTC)</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    clearSessionCache();
                    navigate("/dashboard/student/practice");
                  }}
                  variant="default"
                  className="w-full gap-2 font-bold h-11 bg-primary text-primary-foreground shadow-md"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4" />
                  Practice by Topic
                </Button>
                <Button
                  onClick={() => {
                    clearSessionCache();
                    navigate("/dashboard/student/duel-of-minds");
                  }}
                  variant="outline"
                  className="w-full gap-2 font-bold h-11 border-purple-500/40 text-purple-300 hover:bg-purple-950/30"
                  size="lg"
                >
                  <Swords className="w-4 h-4 text-purple-400" />
                  Duel in the Arena
                </Button>
              </div>

              <Button
                onClick={handleBackToDashboard}
                variant="ghost"
                className="w-full font-semibold h-11"
                size="lg"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={handleRetrySameQuestions}
                variant="default"
                className="w-full gap-2 font-bold text-base h-12 shadow-md"
                size="lg"
              >
                <RotateCcw className="w-5 h-5" />
                Try Again (Same Questions)
              </Button>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Button
                  onClick={handlePracticeNewQuestions}
                  variant="outline"
                  className="w-full gap-2 font-semibold h-11"
                  size="lg"
                >
                  <Sparkles className="w-4 h-4 text-primary" />
                  Practice New Questions
                </Button>
                <Button
                  onClick={handleBackToDashboard}
                  variant="ghost"
                  className="w-full font-semibold h-11"
                  size="lg"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Dashboard
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Snapshot Modal mounted on results screen */}
        <QuestionSnapshotDialog
          open={snapshotDialogOpen}
          onOpenChange={setSnapshotDialogOpen}
          questions={questions}
          userResponses={userResponses}
          answers={answers}
          initialIndex={snapshotInitialIndex}
          onFlagQuestion={(q) => handleOpenFlagDialog(q)}
          flaggedQuestionIds={flaggedQuestionIds}
          subjectName={quizSubject}
        />

        {/* Badge Unlock Celebration Dialog */}
        <BadgeUnlockModal
          badges={unlockedBadges}
          open={badgeModalOpen}
          onClose={() => setBadgeModalOpen(false)}
        />

        {/* Flag Question Dialog (shared) */}
        {flagDialog}
      </div>
    );
  }

  // Active Quiz View
  return (
    <div className="min-h-screen bg-background p-4 pt-20">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={handleBackToDashboard}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Dashboard
          </Button>

          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-2">
              {isDailyChallenge ? (
                <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black border-0 shadow-sm flex items-center gap-1.5 px-3 py-1">
                  <Trophy className="w-3.5 h-3.5" /> Daily Challenge
                </Badge>
              ) : (
                <Badge variant="secondary">{quizSubject || subject || "Mixed Topics"}</Badge>
              )}
              {questions.length > 0 && question && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleOpenFlagDialog(question)}
                  disabled={flaggedQuestionIds.includes(question.id)}
                  className={`h-7 px-2.5 text-xs flex items-center gap-1.5 font-semibold transition-all border rounded-full ${
                    flaggedQuestionIds.includes(question.id)
                      ? "text-green-600 bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30"
                      : "text-red-600 bg-red-50 hover:bg-red-100 border-red-200 dark:text-red-400 dark:bg-red-950/20 dark:hover:bg-red-950/40 dark:border-red-900/30"
                  }`}
                >
                  <Flag
                    className={`h-3 w-3 ${
                      flaggedQuestionIds.includes(question.id) ? "" : "fill-current"
                    }`}
                  />
                  {flaggedQuestionIds.includes(question.id) ? "Flagged" : "Flag"}
                </Button>
              )}
            </div>

            <div className="flex items-center gap-3">
              {/* Active Assignment Countdown Timer */}
              {assignmentDuration && timeLeft !== null && (
                <div
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border transition-all ${
                    timeLeft < 120
                      ? "bg-rose-50 text-rose-600 border-rose-300 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800 animate-pulse"
                      : timeLeft < 300
                      ? "bg-amber-50 text-amber-600 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800"
                      : "bg-primary/10 text-primary border-primary/20"
                  }`}
                  title={`Parent assigned time limit: ${assignmentDuration} minutes`}
                >
                  <Clock className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
                  </span>
                  <span className="text-[10px] opacity-70 font-semibold hidden sm:inline">remaining</span>
                </div>
              )}

              <span className="text-sm text-muted-foreground font-medium">
                Question {currentQuestion + 1} of {questions.length}
              </span>
            </div>
          </div>
          <Progress value={progress} className="h-2" />
        </div>

        <Card className="p-8 animate-fade-in">
          {/* Passage Display (if present) */}
          {question?.passage && (
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

          <h2 className="text-2xl font-bold mb-6">{question?.question}</h2>

          {/* Question Image (Optional) */}
          {question?.image_url && (
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
            {question?.options.map((option, index) => {
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
                      ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                      : showIncorrect
                      ? "border-red-500 bg-red-50 dark:bg-red-900/20"
                      : isSelected
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-primary/50 hover:bg-muted/50"
                  } ${showFeedback ? "cursor-not-allowed" : "cursor-pointer"}`}
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
                      {showCorrect && (
                        <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
                      )}
                      {showIncorrect && (
                        <XCircle className="w-5 h-5 text-red-600 shrink-0" />
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {showFeedback && question && (
            <div
              className={`p-4 rounded-lg mb-6 animate-fade-in ${
                selectedAnswer === question.correctAnswer
                  ? "bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800"
                  : "bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800"
              }`}
            >
              <div className="flex items-start gap-3">
                {selectedAnswer === question.correctAnswer ? (
                  <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                ) : (
                  <XCircle className="w-6 h-6 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                )}
                <div>
                  <p className="font-semibold mb-1">
                    {selectedAnswer === question.correctAnswer
                      ? "Correct! 🎉"
                      : "Incorrect"}
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
                disabled={selectedAnswer === null || grading}
                className="w-full"
                size="lg"
              >
                {grading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Checking…
                  </>
                ) : (
                  "Submit Answer"
                )}
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
            <span>
              Current Score: {score}/{currentQuestion + (showFeedback ? 1 : 0)}
            </span>
            <span>
              {Math.round(
                (score / Math.max(currentQuestion + (showFeedback ? 1 : 0), 1)) * 100
              )}
              % Accuracy
            </span>
          </div>
        </Card>
      </div>

      {/* Flag Question Dialog (shared) */}
      {flagDialog}

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
