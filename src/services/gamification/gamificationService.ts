/**
 * Éclat Gamification Service
 *
 * The client-side gamification pipeline (recordSessionGamification) was
 * removed: quiz EP, mastery, streaks, badges and league points are written by
 * the server-authoritative pipeline (complete-quiz-session edge function and
 * the duel RPCs), and the database policies no longer permit client writes.
 * What remains is the session-outcome shape used by the point-breakdown UI and
 * the league cohort reader.
 */

import { supabase } from "@/integrations/supabase/client";
import type { StudentLevelInfo, DailyChallengeResult, SessionPointResult } from "./types";
import type { BadgeDefinition } from "./badgeEngine";

export interface GamificationSessionOutcome {
  pointResult: SessionPointResult;
  masteryOutcome?: {
    previousStatus: string;
    newStatus: string;
    previousAccuracy: number;
    newAccuracy: number;
    totalBonusEP: number;
  };
  streakOutcome?: {
    currentStreak: number;
    streakIncremented: boolean;
    streakPreservedByShield: boolean;
    milestoneBonusEP: number;
  };
  dailyChallengeOutcome?: DailyChallengeResult;
  levelOutcome: StudentLevelInfo;
  unlockedBadges: BadgeDefinition[];
}

/**
 * Retrieves the current week's 30-player league cohort and standings for a student.
 */
export async function getStudentLeagueCohort(studentId: string) {
  try {
    const { data, error } = await supabase.rpc("get_student_league_cohort", {
      p_student_id: studentId,
    });
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Error retrieving league cohort:", err);
    return null;
  }
}
