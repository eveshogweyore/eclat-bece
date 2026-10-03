/**
 * Server-authoritative quiz session client.
 *
 * Correctness is graded server-side (submit_quiz_answer) and the EP pipeline
 * runs in the complete-quiz-session Edge Function. Questions are delivered
 * without correct answers; per-question feedback comes from the grading RPC.
 */
import { supabase } from "@/integrations/supabase/client";
import type {
  GamificationSessionOutcome,
} from "@/services/gamification/gamificationService";

export type QuizSessionMode = "practice" | "daily_challenge" | "duel";

export interface StartSessionParams {
  mode: QuizSessionMode;
  questionIds: string[];
  subject?: string | null;
  topic?: string | null;
  assignmentId?: string | null;
  arenaChallengeId?: string | null;
}

export interface SubmitAnswerResult {
  is_correct: boolean;
  correct_index: number | null;
  explanation: string | null;
}

export interface QuestionAnswerKeyEntry {
  question_id: string;
  is_correct: boolean;
  correct_index: number | null;
}

export interface CompleteSessionResult {
  quizResultId?: string;
  pointResult: GamificationSessionOutcome["pointResult"];
  masteryOutcome?: GamificationSessionOutcome["masteryOutcome"];
  streakOutcome?: GamificationSessionOutcome["streakOutcome"];
  dailyChallengeOutcome?: GamificationSessionOutcome["dailyChallengeOutcome"];
  levelOutcome: GamificationSessionOutcome["levelOutcome"];
  unlockedBadges: GamificationSessionOutcome["unlockedBadges"];
  questionAnswerKey: QuestionAnswerKeyEntry[];
}

export async function startQuizSession(
  params: StartSessionParams
): Promise<string> {
  const { data, error } = await supabase.rpc("start_quiz_session", {
    p_mode: params.mode,
    p_question_ids: params.questionIds,
    p_subject: params.subject ?? null,
    p_topic: params.topic ?? null,
    p_assignment_id: params.assignmentId ?? null,
    p_arena_challenge_id: params.arenaChallengeId ?? null,
  });
  if (error) {
    throw error;
  }
  const result = data as unknown as { session_id?: string } | null;
  if (!result?.session_id) {
    throw new Error("Failed to start quiz session");
  }
  return result.session_id;
}

export async function submitQuizAnswer(
  sessionId: string,
  questionId: string,
  selectedIndex: number,
  timeSpentMs: number
): Promise<SubmitAnswerResult> {
  const { data, error } = await supabase.rpc("submit_quiz_answer", {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_selected_index: selectedIndex,
    p_time_spent_ms: Math.max(0, Math.round(timeSpentMs)),
  });
  if (error) {
    throw error;
  }
  return data as unknown as SubmitAnswerResult;
}

export async function completeQuizSession(
  sessionId: string
): Promise<CompleteSessionResult> {
  const { data, error } = await supabase.functions.invoke("complete-quiz-session", {
    body: { sessionId },
  });
  if (error) {
    throw new Error(error.message || "Failed to complete quiz session");
  }
  const payload = data as { outcome?: CompleteSessionResult; error?: string } | null;
  if (payload?.error) {
    throw new Error(payload.error);
  }
  if (!payload?.outcome) {
    throw new Error("Failed to complete quiz session");
  }
  return payload.outcome;
}

export async function submitDuelTurnServer(
  challengeId: string,
  sessionId: string
): Promise<{ status: string; resolved: boolean; outcome?: string; winner_id?: string | null; ep_awarded?: number }> {
  // Server-authoritative: score and duration are derived from the completed
  // session's recorded answers — only the ids travel from the client.
  const { data, error } = await supabase.rpc("submit_duel_turn", {
    p_challenge_id: challengeId,
    p_session_id: sessionId,
  });
  if (error) {
    throw error;
  }
  return data as unknown as {
    status: string;
    resolved: boolean;
    outcome?: string;
    winner_id?: string | null;
    ep_awarded?: number;
  };
}

export function isDailyChallengeError(err: unknown): boolean {
  return String((err as Error)?.message ?? "").includes("DAILY_CHALLENGE_ALREADY_COMPLETED");
}
