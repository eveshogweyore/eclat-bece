-- Data-integrity housekeeping for the school domain: keep updated_at honest
-- and prevent duplicate exams/teachers per school.

CREATE TRIGGER IF NOT EXISTS set_school_classes_updated_at
  BEFORE UPDATE ON public.school_classes
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER IF NOT EXISTS set_school_exams_updated_at
  BEFORE UPDATE ON public.school_exams
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER IF NOT EXISTS set_school_teachers_updated_at
  BEFORE UPDATE ON public.school_teachers
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_exams_school_title_date
  ON public.school_exams (school_id, lower(title), exam_date);

CREATE UNIQUE INDEX IF NOT EXISTS uq_school_teachers_school_email
  ON public.school_teachers (school_id, lower(email))
  WHERE email IS NOT NULL;
