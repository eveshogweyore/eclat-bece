/**
 * Head-to-Head Arena Service
 * Handles persistence, matchmaking queries, duel turn submission, and point distribution
 */

import { supabase } from "@/integrations/supabase/client";
import {
  ArenaMatchInput,
  ArenaMatchResult,
  ArenaChallenge,
} from "./types";
import { submitDuelTurnServer } from "@/services/quizSession";

export interface CreateChallengeInput {
  challengerId: string;
  opponentId: string;
  challengeName: string;
  subject: string;
  topic?: string;
  maxTimeSeconds: number;
  questionIds: string[];
}

/**
 * Creates and persists a new challenge in the database
 */
export async function createDuelChallenge(input: CreateChallengeInput): Promise<string | null> {
  try {
    const { data, error } = await supabase.rpc("create_arena_challenge", {
      p_challenger_id: input.challengerId,
      p_opponent_id: input.opponentId,
      p_challenge_name: input.challengeName,
      p_subject: input.subject,
      p_topic: input.topic || null,
      p_max_time_seconds: input.maxTimeSeconds,
      p_question_ids: input.questionIds,
    });

    if (error) throw error;
    return data as string;
  } catch (err) {
    console.error("Failed to create duel challenge:", err);
    throw err;
  }
}

/**
 * Fetches challenges where current student is the opponent and status is 'pending'
 */
export async function fetchIncomingChallenges(studentId: string): Promise<ArenaChallenge[]> {
  try {
    const { data, error } = await supabase
      .from("arena_challenges")
      .select(`
        id,
        challenger_id,
        opponent_id,
        challenge_name,
        subject,
        topic,
        question_ids,
        max_time_seconds,
        status,
        challenger_score,
        opponent_score,
        winner_id,
        created_at,
        challenger:students!arena_challenges_challenger_id_fkey(
          id,
          profile:profiles(full_name, username),
          school:schools(school_name)
        )
      `)
      .eq("opponent_id", studentId)
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      challengerId: row.challenger_id,
      opponentId: row.opponent_id,
      challengerName: row.challenger?.profile?.full_name || row.challenger?.profile?.username || "Fellow Scholar",
      opponentName: "You",
      challengerSchool: row.challenger?.school?.school_name,
      subject: row.subject,
      topic: row.topic,
      numberOfQuestions: (row.question_ids || []).length,
      maxTimeSeconds: row.max_time_seconds,
      status: row.status,
      createdAt: row.created_at,
    }));
  } catch (err) {
    console.error("Error fetching incoming challenges:", err);
    return [];
  }
}

/**
 * Fetches active or completed challenges for a student
 */
export async function fetchStudentDuelHistory(studentId: string): Promise<ArenaChallenge[]> {
  try {
    const { data, error } = await supabase
      .from("arena_challenges")
      .select(`
        id,
        challenger_id,
        opponent_id,
        challenge_name,
        subject,
        topic,
        question_ids,
        max_time_seconds,
        status,
        challenger_score,
        challenger_time_taken,
        opponent_score,
        opponent_time_taken,
        challenger_ep,
        opponent_ep,
        winner_id,
        created_at,
        completed_at,
        challenger:students!arena_challenges_challenger_id_fkey(
          id,
          profile:profiles(full_name, username)
        ),
        opponent:students!arena_challenges_opponent_id_fkey(
          id,
          profile:profiles(full_name, username)
        )
      `)
      .or(`challenger_id.eq.${studentId},opponent_id.eq.${studentId}`)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return (data || []).map((row: any) => ({
      id: row.id,
      challengerId: row.challenger_id,
      opponentId: row.opponent_id,
      challengerName: row.challenger?.profile?.full_name || row.challenger?.profile?.username || "Challenger",
      opponentName: row.opponent?.profile?.full_name || row.opponent?.profile?.username || "Opponent",
      subject: row.subject,
      topic: row.topic,
      numberOfQuestions: (row.question_ids || []).length,
      maxTimeSeconds: row.max_time_seconds,
      status: row.status,
      challengerScore: row.challenger_score,
      challengerTimeSeconds: row.challenger_time_taken,
      opponentScore: row.opponent_score,
      opponentTimeSeconds: row.opponent_time_taken,
      challengerEP: row.challenger_ep,
      opponentEP: row.opponent_ep,
      winnerId: row.winner_id,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    }));
  } catch (err) {
    console.error("Error fetching duel history:", err);
    return [];
  }
}

/**
 * Accepts or declines an incoming challenge. Only the opponent, and only while
 * the challenge is still pending, may transition it.
 */
export async function updateChallengeStatus(
  challengeId: string,
  studentId: string,
  newStatus: "accepted" | "declined"
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from("arena_challenges")
      .update({ status: newStatus })
      .eq("id", challengeId)
      .eq("opponent_id", studentId)
      .eq("status", "pending");

    if (error) throw error;
    return true;
  } catch (err) {
    console.error("Error updating challenge status:", err);
    return false;
  }
}

/**
 * Submits duel performance for a student and completes the match if both have played.
 *
 * Server-authoritative: the score and duration are computed from the
 * completed quiz session's recorded answers — the client sends only the
 * challenge and session ids.
 */
export async function submitDuelTurn(params: {
  challengeId: string;
  sessionId: string;
}): Promise<{ isMatchComplete: boolean; matchResult?: ArenaMatchResult }> {
  const { challengeId, sessionId } = params;

  const result = await submitDuelTurnServer(challengeId, sessionId);

  if (!result.resolved) {
    return { isMatchComplete: false };
  }

  const outcome = (result.outcome ?? "draw") as "win" | "draw" | "loss";
  const matchResult: ArenaMatchResult = {
    outcome,
    baseEP: result.ep_awarded ?? 0,
    upsetBonusEP: 0,
    streakBonusEP: 0,
    totalEP: result.ep_awarded ?? 0,
    newWinStreak: 0,
    isUpset: false,
    cappedByCollusion: false,
    breakdown: [],
  };
  return { isMatchComplete: true, matchResult };
}

