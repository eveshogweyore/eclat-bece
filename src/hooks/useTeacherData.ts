import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { queryKeys } from "@/lib/queryKeys";

export interface TeacherClass {
  id: string;
  name: string;
  level: string;
  class_year: string | null;
}

export interface TeacherStudent {
  id: string;
  user_id: string;
  class_id: string | null;
  class_name: string;
  class_year: string | null;
  is_premium: boolean;
  name: string;
  username: string;
  avgScore: number;
  quizCount: number;
}

export interface TeacherAssignmentItem {
  id: string;
  student_id: string;
  student_name: string;
  subject: string;
  topics: string[];
  num_questions: number;
  duration: number;
  status: string;
  score: number | null;
  completed_at: string | null;
  created_at: string;
  created_by_teacher_id: string | null;
}

export interface TeacherDataset {
  schoolId: string | null;
  teacher: {
    id: string;
    fullName: string;
    email: string | null;
    status: string;
  };
  schoolName: string | null;
  classes: TeacherClass[];
  students: TeacherStudent[];
  assignments: TeacherAssignmentItem[];
}

async function fetchTeacherDataset(userId: string): Promise<TeacherDataset> {
  // 1. Own registry row (RLS: teachers read their own record)
  const { data: teacher, error: teacherErr } = await supabase
    .from("school_teachers")
    .select("id, full_name, email, status, school_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (teacherErr) throw teacherErr;
  if (!teacher) throw new Error("Teacher record not found. Contact your school administrator.");

  // 2. School name + all of the school's classes (RLS: school-scoped)
  const [schoolRes, classesRes] = await Promise.all([
    supabase.from("schools").select("school_name").eq("id", teacher.school_id).maybeSingle(),
    supabase.from("school_classes").select("id, name, level, class_year").eq("school_id", teacher.school_id),
  ]);
  if (schoolRes.error) throw schoolRes.error;
  if (classesRes.error) throw classesRes.error;

  const classes = (classesRes.data || []) as Array<{ id: string; name: string; level: string; class_year: string | null }>;
  const classNames = new Map(classes.map((c) => [c.id, c.name]));

  // 3. All students of the teacher's school (RLS: school-scoped)
  const studentsRes = await supabase
    .from("students")
    .select("id, user_id, class_id, class_year, is_premium, profile:profiles(full_name, username)")
    .eq("school_id", teacher.school_id);
  if (studentsRes.error) throw studentsRes.error;

  type RawStudent = {
    id: string;
    user_id: string;
    class_id: string | null;
    class_year: string | null;
    is_premium: boolean;
    profile: { full_name: string | null; username: string | null } | null;
  };
  const rawStudents = (studentsRes.data || []) as unknown as RawStudent[];

  // 4. Results + assignments scoped to those students (RLS: school-scoped)
  const studentIds = rawStudents.map((s) => s.id);
  const [resultsRes, assignmentsRes] = await Promise.all([
    studentIds.length > 0
      ? supabase.from("quiz_results").select("student_id, score").in("student_id", studentIds).limit(5000)
      : Promise.resolve({ data: [] as Array<{ student_id: string; score: number }>, error: null as unknown }),
    studentIds.length > 0
      ? supabase
          .from("practice_assignments")
          .select("id, student_id, subject, topics, num_questions, duration, status, score, completed_at, created_at, created_by_teacher_id")
          .in("student_id", studentIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as Array<Record<string, unknown>>, error: null as unknown }),
  ]);
  if (resultsRes.error) throw resultsRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;

  const scoreMap: Record<string, { total: number; count: number }> = {};
  ((resultsRes.data || []) as Array<{ student_id: string; score: number }>).forEach((r) => {
    const cur = scoreMap[r.student_id] || { total: 0, count: 0 };
    scoreMap[r.student_id] = { total: cur.total + r.score, count: cur.count + 1 };
  });

  const students: TeacherStudent[] = rawStudents
    .map((s) => {
      const stats = scoreMap[s.id];
      return {
        id: s.id,
        user_id: s.user_id,
        class_id: s.class_id,
        class_name: s.class_id ? classNames.get(s.class_id) || "— " + s.class_id.slice(0, 6) : "No class arm",
        class_year: s.class_year,
        is_premium: s.is_premium,
        name: s.profile?.full_name || s.profile?.username || "Student",
        username: s.profile?.username || "",
        avgScore: stats && stats.count > 0 ? Math.round(stats.total / stats.count) : 0,
        quizCount: stats?.count || 0,
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const studentNames = new Map(students.map((s) => [s.id, s.name]));
  const assignments: TeacherAssignmentItem[] = ((assignmentsRes.data || []) as Array<Record<string, any>>).map((a) => ({
    id: a.id,
    student_id: a.student_id,
    student_name: studentNames.get(a.student_id) || "Student",
    subject: a.subject,
    topics: Array.isArray(a.topics) ? a.topics : [],
    num_questions: a.num_questions || 0,
    duration: a.duration || 0,
    status: a.status || "pending",
    score: a.score ?? null,
    completed_at: a.completed_at ?? null,
    created_at: a.created_at,
    created_by_teacher_id: a.created_by_teacher_id ?? null,
  }));

  return {
    schoolId: teacher.school_id as string | null,
    teacher: {
      id: teacher.id,
      fullName: teacher.full_name,
      email: teacher.email,
      status: teacher.status,
    },
    schoolName: schoolRes.data?.school_name || null,
    classes,
    students,
    assignments,
  };
}

export function useTeacherData() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: queryKeys.teacher(user?.id),
    enabled: !!user,
    staleTime: 60 * 1000,
    queryFn: () => fetchTeacherDataset(user!.id),
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: queryKeys.teacher(user?.id) }),
    [queryClient, user?.id]
  );

  return {
    teacher: query.data?.teacher ?? null,
    schoolId: query.data?.schoolId ?? null,
    schoolName: query.data?.schoolName ?? null,
    classes: query.data?.classes ?? [],
    students: query.data?.students ?? [],
    assignments: query.data?.assignments ?? [],
    isLoading: query.isLoading,
    error: query.error instanceof Error ? query.error.message : null,
    refresh,
  };
}
