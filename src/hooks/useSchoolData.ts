import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SchoolData } from "@/components/school/SchoolSettingsDialog";
import { SchoolTopicMasteryRecord } from "@/components/school/CurriculumWeaknessHeatmap";
import { EnrichedStudentRecord } from "@/components/school/ClassroomLeaderboardView";
import { queryKeys } from "@/lib/queryKeys";

export type { SchoolTopicMasteryRecord, EnrichedStudentRecord };

export interface SchoolStudent extends EnrichedStudentRecord {
  class_id?: string | null;
  created_at: string;
  rank: number;
  status: "Active" | "Inactive";
}

export interface SchoolClassItem {
  id: string;
  name: string;
  level: string;
  class_year: "year_6" | "year_9" | null;
  lead_teacher: string | null;
  created_at: string;
  studentsCount: number;
  avgScore: number;
  badge: string;
}

export interface SchoolAssignmentItem {
  id: string;
  subject: string;
  topics: string[];
  num_questions: number;
  duration: number;
  status: string;
  created_at: string;
  completed_at: string | null;
  score: number | null;
  student_id: string;
  student_name: string;
}

export interface AssignmentStats {
  total: number;
  completed: number;
  inProgress: number;
  completionRate: number;
}

export interface CohortAverages {
  year_6: number;
  year_9: number;
  overall: number;
}

export interface GamificationTotals {
  totalEP: number;
  totalQuizzesTaken: number;
  activeLearnersCount: number;
  topAchievers: SchoolStudent[];
}

export interface SchoolExamItem {
  id: string;
  school_id: string;
  title: string;
  cohort: "year_6" | "year_9";
  class_id: string | null;
  class_name?: string;
  subject: string;
  exam_date: string;
  start_time: string | null;
  duration_minutes: number;
  question_count: number;
  passing_score: number;
  status: "Scheduled" | "In Progress" | "Completed" | "Draft" | "Archived";
  instructions: string | null;
  created_at: string;
  eligibleStudentCount?: number;
}

export interface SchoolTeacherItem {
  id: string;
  school_id: string;
  user_id?: string | null;
  full_name: string;
  email: string | null;
  phone: string | null;
  department: string | null;
  primary_subject: string | null;
  assigned_class_ids: string[];
  assigned_classes: string[];
  status: "Active" | "On Leave" | "Inactive";
  created_at: string;
}

interface SchoolDataset {
  school: SchoolData;
  students: SchoolStudent[];
  classes: SchoolClassItem[];
  topicMastery: SchoolTopicMasteryRecord[];
  assignments: SchoolAssignmentItem[];
  exams: SchoolExamItem[];
  teachers: SchoolTeacherItem[];
  quizScores: Array<{ id: string; student_id: string; score: number; subject: string; total_questions: number; correct_answers: number; completed_at: string }>;
}

async function fetchSchoolDataset(): Promise<SchoolDataset> {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1. Fetch School record
  const { data: existingSchool, error: schoolErr } = await supabase
    .from("schools")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  if (schoolErr) throw schoolErr;

  let currentSchool = existingSchool;
  if (!currentSchool) {
    // provision-user creates this row at signup; this fallback is race-safe so
    // two concurrent cold mounts cannot double-insert.
    const { error: createErr } = await supabase
      .from("schools")
      .upsert(
        {
          user_id: user.id,
          school_name: user.user_metadata?.full_name || user.user_metadata?.school_name || "My School",
        },
        { onConflict: "user_id", ignoreDuplicates: true }
      );
    if (createErr) throw createErr;

    const { data: refetchedSchool, error: refetchErr } = await supabase
      .from("schools")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();
    if (refetchErr) throw refetchErr;
    currentSchool = refetchedSchool;
  }

  if (!currentSchool) {
    throw new Error("School profile not found. Please sign out and back in, or contact support.");
  }

  // 2. Fetch Linked Students, Classes, Assignments, Exams & Teachers in parallel
  const [rawStudentsRes, rawClassesRes, rawAssignmentsRes, rawExamsRes, rawTeachersRes] = await Promise.all([
    supabase
      .from("students")
      .select("id, user_id, class_year, class_id, is_premium, created_at")
      .eq("school_id", currentSchool.id),
    supabase
      .from("school_classes")
      .select("id, name, level, class_year, lead_teacher, created_at")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("practice_assignments")
      .select("id, student_id, subject, topics, num_questions, duration, status, created_at, completed_at, score")
      .eq("school_id", currentSchool.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("school_exams")
      .select("id, school_id, title, cohort, class_id, subject, exam_date, start_time, duration_minutes, question_count, passing_score, status, instructions, created_at")
      .eq("school_id", currentSchool.id)
      .order("exam_date", { ascending: true }),
    supabase
      .from("school_teachers")
      .select("id, school_id, user_id, full_name, email, phone, department, primary_subject, assigned_class_ids, status, created_at")
      .eq("school_id", currentSchool.id)
      .order("full_name", { ascending: true }),
  ]);

  if (rawStudentsRes.error) throw rawStudentsRes.error;
  const studentList = rawStudentsRes.data || [];
  const rawClasses = rawClassesRes.data || [];
  const rawAssignments = rawAssignmentsRes.data || [];
  const rawExams = rawExamsRes.data || [];
  const rawTeachers = rawTeachersRes.data || [];

  const userIds = studentList.map((s) => s.user_id);
  const studentIds = studentList.map((s) => s.id);

  // 3. Parallel Batch Fetching of Dependent Metrics
  let profiles: Array<{ id: string; full_name: string | null; username: string | null; unique_id: string; avatar_url: string | null }> = [];
  let quizResults: Array<{ id: string; student_id: string; score: number; subject: string; total_questions: number; correct_answers: number; completed_at: string }> = [];
  let gamificationProfiles: Array<{ student_id: string; lifetime_ep: number; weekly_ep: number; current_level: number; streak_count: number; current_league_tier: number }> = [];
  let masteries: Array<{ student_id: string; subject: string; topic: string; rolling_accuracy: number; status: string; total_attempted: number }> = [];

  if (studentIds.length > 0) {
    const [profRes, quizRes, gamRes, mastRes] = await Promise.all([
      userIds.length > 0
        ? supabase.from("profiles").select("id, full_name, username, unique_id, avatar_url").in("id", userIds)
        : Promise.resolve({ data: [] as typeof profiles }),
      // Safety caps: per-student metric pulls are unbounded by design (lifetime
      // aggregates), but a runaway roster should not exhaust browser memory.
      supabase.from("quiz_results").select("id, student_id, score, subject, total_questions, correct_answers, completed_at").in("student_id", studentIds).limit(5000),
      supabase.from("student_gamification_profile").select("student_id, lifetime_ep, weekly_ep, current_level, streak_count, current_league_tier").in("student_id", studentIds),
      supabase.from("student_topic_mastery").select("student_id, subject, topic, rolling_accuracy, status, total_attempted").in("student_id", studentIds).limit(5000),
    ]);

    profiles = profRes.data || [];
    quizResults = quizRes.data || [];
    gamificationProfiles = gamRes.data || [];
    masteries = mastRes.data || [];
  }

  // Map profiles
  const profileMap = new Map<string, { full_name: string | null; username: string | null; unique_id: string; avatar_url: string | null }>();
  profiles.forEach((p) => profileMap.set(p.id, p));

  // Map quiz scores
  const scoreMap: Record<string, { total: number; count: number }> = {};
  quizResults.forEach((r) => {
    if (!scoreMap[r.student_id]) scoreMap[r.student_id] = { total: 0, count: 0 };
    scoreMap[r.student_id].total += r.score;
    scoreMap[r.student_id].count += 1;
  });

  // Map gamification profiles
  const gamificationMap = new Map<string, {
    lifetime_ep: number;
    weekly_ep: number;
    current_level: number;
    current_streak: number;
    league_tier: number;
  }>();
  gamificationProfiles.forEach((g) => {
    gamificationMap.set(g.student_id, {
      lifetime_ep: Number(g.lifetime_ep || 0),
      weekly_ep: Number(g.weekly_ep || 0),
      current_level: Number(g.current_level || 1),
      current_streak: Number(g.streak_count || 0),
      league_tier: Number(g.current_league_tier || 1),
    });
  });

  // Map mastery records
  const studentMasteryMap = new Map<string, { mastered: number; weak: number; total: number; accuracySum: number }>();
  masteries.forEach((m) => {
    const sid = m.student_id;
    const current = studentMasteryMap.get(sid) || { mastered: 0, weak: 0, total: 0, accuracySum: 0 };
    current.total += 1;
    current.accuracySum += Number(m.rolling_accuracy || 0);
    if (m.status === "mastered" || Number(m.rolling_accuracy) >= 80) {
      current.mastered += 1;
    } else if (m.status === "weak" || Number(m.rolling_accuracy) < 60) {
      current.weak += 1;
    }
    studentMasteryMap.set(sid, current);
  });

  // Student name map for assignments
  const studentNameMap = new Map<string, string>();

  // 4. Assemble fully enriched student records
  const parsedStudents: SchoolStudent[] = studentList.map((s) => {
    const prof = profileMap.get(s.user_id);
    const name = prof?.full_name || prof?.username || "Student";
    studentNameMap.set(s.id, name);

    const stats = scoreMap[s.id];
    const avgScore = stats && stats.count > 0 ? Math.round(stats.total / stats.count) : 0;
    const quizCount = stats?.count || 0;

    const gam = gamificationMap.get(s.id) || {
      lifetime_ep: 0,
      weekly_ep: 0,
      current_level: 1,
      current_streak: 0,
      league_tier: 1,
    };

    const mast = studentMasteryMap.get(s.id) || { mastered: 0, weak: 0, total: 0, accuracySum: 0 };
    const masteryPct = mast.total > 0 ? Math.round((mast.mastered / mast.total) * 100) : 0;

    return {
      id: s.id,
      user_id: s.user_id,
      class_id: s.class_id,
      class_year: s.class_year,
      is_premium: s.is_premium,
      created_at: s.created_at,
      name,
      username: prof?.username || "",
      unique_id: prof?.unique_id || "",
      avatar: prof?.avatar_url || "",
      avgScore,
      quizCount,
      rank: 0,
      status: quizCount > 0 || gam.lifetime_ep > 0 ? "Active" : "Inactive",
      lifetime_ep: gam.lifetime_ep,
      current_level: gam.current_level,
      weekly_ep: gam.weekly_ep,
      league_tier: gam.league_tier,
      current_streak: gam.current_streak,
      mastered_topics_count: mast.mastered,
      weak_topics_count: mast.weak,
      mastery_percentage: masteryPct,
    };
  });

  // Sort by avgScore descending (with tiebreaker lifetime_ep) and assign ranks
  parsedStudents.sort((a, b) => {
    if (b.avgScore !== a.avgScore) return b.avgScore - a.avgScore;
    return b.lifetime_ep - a.lifetime_ep;
  });
  parsedStudents.forEach((s, i) => { s.rank = i + 1; });

  // 5. Assemble enriched class records
  const parsedClasses: SchoolClassItem[] = rawClasses.map((c) => {
    const cohortStudents = parsedStudents.filter(
      (s) => s.class_id === c.id || (!s.class_id && c.class_year && s.class_year === c.class_year)
    );
    const count = cohortStudents.length;
    const tested = cohortStudents.filter((s) => s.quizCount > 0);
    const avg = tested.length > 0
      ? Math.round(tested.reduce((acc, s) => acc + s.avgScore, 0) / tested.length)
      : 0;

    return {
      id: c.id,
      name: c.name,
      level: c.level,
      class_year: c.class_year as SchoolClassItem["class_year"],
      lead_teacher: c.lead_teacher,
      created_at: c.created_at,
      studentsCount: count,
      avgScore: avg,
      badge: c.class_year === "year_9" ? "BECE Cohort" : "Common Entrance",
    };
  });

  // 6. Assemble topic mastery
  const parsedTopicMastery: SchoolTopicMasteryRecord[] = masteries.map((m) => ({
    student_id: m.student_id,
    subject: m.subject,
    topic: m.topic,
    rolling_accuracy: Number(m.rolling_accuracy || 0),
    status: m.status || "developing",
    total_attempted: Number(m.total_attempted || 0),
  }));

  // 7. Assemble assignments
  const parsedAssignments: SchoolAssignmentItem[] = rawAssignments.map((a) => ({
    id: a.id,
    subject: a.subject,
    topics: Array.isArray(a.topics) ? a.topics : [],
    num_questions: a.num_questions || 10,
    duration: a.duration || 15,
    status: a.status || "pending",
    created_at: a.created_at,
    completed_at: a.completed_at || null,
    score: a.score !== undefined ? a.score : null,
    student_id: a.student_id,
    student_name: studentNameMap.get(a.student_id) || "Assigned Student",
  }));

  // 8. Assemble exams
  const classMap = new Map(rawClasses.map((c) => [c.id, c.name]));
  const parsedExams: SchoolExamItem[] = rawExams.map((e) => {
    const matchingStudents = parsedStudents.filter((s) => {
      if (e.class_id) return s.class_id === e.class_id;
      return s.class_year === e.cohort;
    });

    return {
      id: e.id,
      school_id: e.school_id,
      title: e.title,
      cohort: e.cohort as SchoolExamItem["cohort"],
      class_id: e.class_id || null,
      class_name: e.class_id ? classMap.get(e.class_id) || "Assigned Class" : "All Cohort Classes",
      subject: e.subject,
      exam_date: e.exam_date,
      start_time: e.start_time || null,
      duration_minutes: Number(e.duration_minutes || 60),
      question_count: Number(e.question_count || 40),
      passing_score: Number(e.passing_score || 50),
      status: (e.status || "Scheduled") as SchoolExamItem["status"],
      instructions: e.instructions || null,
      created_at: e.created_at,
      eligibleStudentCount: matchingStudents.length,
    };
  });

  // 9. Assemble teachers (registered + class leads backward compatibility)
  const registeredTeacherNames = new Set(rawTeachers.map((t) => t.full_name.trim().toLowerCase()));

  const enrichedTeachers: SchoolTeacherItem[] = rawTeachers.map((t) => {
    const classNames = (t.assigned_class_ids || [])
      .map((cid: string) => classMap.get(cid))
      .filter(Boolean) as string[];

    return {
      id: t.id,
      school_id: t.school_id,
      user_id: t.user_id || null,
      full_name: t.full_name,
      email: t.email || null,
      phone: t.phone || null,
      department: t.department || "General Faculty",
      primary_subject: t.primary_subject || "Core Subjects",
      assigned_class_ids: t.assigned_class_ids || [],
      assigned_classes: classNames,
      status: (t.status || "Active") as SchoolTeacherItem["status"],
      created_at: t.created_at,
    };
  });

  // Backward compatibility: If any class has a lead_teacher not yet in school_teachers, add them
  rawClasses.forEach((c) => {
    if (c.lead_teacher && c.lead_teacher.trim()) {
      const cleanName = c.lead_teacher.trim();
      if (!registeredTeacherNames.has(cleanName.toLowerCase())) {
        const existingVirtual = enrichedTeachers.find(
          (t) => t.full_name.toLowerCase() === cleanName.toLowerCase()
        );
        if (existingVirtual) {
          if (!existingVirtual.assigned_classes.includes(c.name)) {
            existingVirtual.assigned_classes.push(c.name);
          }
          if (!existingVirtual.assigned_class_ids.includes(c.id)) {
            existingVirtual.assigned_class_ids.push(c.id);
          }
        } else {
          enrichedTeachers.push({
            id: `virtual-${c.id}`,
            school_id: currentSchool.id,
            full_name: cleanName,
            email: null,
            phone: null,
            department: "Class Arm Faculty",
            primary_subject: "Class Lead",
            assigned_class_ids: [c.id],
            assigned_classes: [c.name],
            status: "Active",
            created_at: c.created_at,
          });
          registeredTeacherNames.add(cleanName.toLowerCase());
        }
      }
    }
  });

  return {
    school: currentSchool as SchoolData,
    students: parsedStudents,
    classes: parsedClasses,
    topicMastery: parsedTopicMastery,
    assignments: parsedAssignments,
    exams: parsedExams,
    teachers: enrichedTeachers,
    quizScores: quizResults,
  };
}

export function useSchoolData() {
  const { user } = useAuth();

  // One cached query serves all nine school pages: navigating between them no
  // longer refires the full 11-query aggregation while the cache is fresh.
  const query = useQuery({
    queryKey: queryKeys.school(user?.id),
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: fetchSchoolDataset,
  });

  const school = query.data?.school ?? null;
  const students = query.data?.students ?? [];
  const classes = query.data?.classes ?? [];
  const topicMastery = query.data?.topicMastery ?? [];
  const assignments = query.data?.assignments ?? [];
  const exams = query.data?.exams ?? [];
  const teachers = query.data?.teachers ?? [];
  const quizScores = query.data?.quizScores ?? [];

  // Computed Institutional Aggregates
  const assignmentStats: AssignmentStats = useMemo(() => {
    const total = assignments.length;
    const completed = assignments.filter((a) => a.status === "completed" || a.completed_at != null).length;
    const inProgress = total - completed;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, inProgress, completionRate };
  }, [assignments]);

  const cohortAverages: CohortAverages = useMemo(() => {
    const y6 = students.filter((s) => s.class_year === "year_6" && s.quizCount > 0);
    const y9 = students.filter((s) => s.class_year === "year_9" && s.quizCount > 0);
    const tested = students.filter((s) => s.quizCount > 0);

    const year_6 = y6.length > 0 ? Math.round(y6.reduce((acc, s) => acc + s.avgScore, 0) / y6.length) : 0;
    const year_9 = y9.length > 0 ? Math.round(y9.reduce((acc, s) => acc + s.avgScore, 0) / y9.length) : 0;
    const overall = tested.length > 0 ? Math.round(tested.reduce((acc, s) => acc + s.avgScore, 0) / tested.length) : 0;

    return { year_6, year_9, overall };
  }, [students]);

  const gamificationTotals: GamificationTotals = useMemo(() => {
    const totalEP = students.reduce((acc, s) => acc + s.lifetime_ep, 0);
    const totalQuizzesTaken = students.reduce((acc, s) => acc + s.quizCount, 0);
    const activeLearnersCount = students.filter((s) => s.quizCount > 0 || s.lifetime_ep > 0).length;
    const topAchievers = [...students]
      .sort((a, b) => (b.lifetime_ep || b.avgScore) - (a.lifetime_ep || a.avgScore))
      .slice(0, 5);

    return { totalEP, totalQuizzesTaken, activeLearnersCount, topAchievers };
  }, [students]);

  return {
    school,
    students,
    classes,
    topicMastery,
    assignments,
    assignmentStats,
    exams,
    teachers,
    cohortAverages,
    gamificationTotals,
    quizScores,
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh: async () => {
      await query.refetch();
    },
  };
}
