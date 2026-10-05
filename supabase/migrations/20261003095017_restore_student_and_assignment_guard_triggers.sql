-- Restores the student and practice-assignment guard triggers.
--
-- The original migration was applied to production on 2026-10-03 but its SQL
-- was never committed to this repository (it showed as remote-only in
-- `supabase migration list`). This file is recreated from the live trigger
-- definitions so that provisioning from local migrations matches production.
-- It was marked as already applied via `supabase migration repair`.
--
-- The guard functions themselves are created in
-- 20260526090000_parent_student_accounts_assignments.sql and hardened in
-- 20261003120000_school_security_hardening.sql.

DROP TRIGGER IF EXISTS enforce_practice_assignment_rules ON public.practice_assignments;
CREATE TRIGGER enforce_practice_assignment_rules
  BEFORE INSERT OR UPDATE OF student_id, parent_id, topics, num_questions
  ON public.practice_assignments
  FOR EACH ROW EXECUTE FUNCTION enforce_practice_assignment_rules();

DROP TRIGGER IF EXISTS enforce_student_self_update_rules ON public.students;
CREATE TRIGGER enforce_student_self_update_rules
  BEFORE UPDATE ON public.students
  FOR EACH ROW EXECUTE FUNCTION enforce_student_self_update_rules();
