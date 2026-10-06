-- Link Code: schools adopt existing students by the student's link code.
--
-- Until now students.school_id was only stamped at creation time by the
-- create-student-account edge function; there was no way to attach an
-- existing (e.g. parent-created) student to a school. RLS cannot do it
-- either: "Schools can update their students" requires the school to already
-- own the row, and students are blocked from touching school_id by the
-- self-update guard. These SECURITY DEFINER RPCs are the sanctioned path.
--
-- The link is instant: the student's link code (profiles.unique_id) is an
-- 8-character secret the student deliberately shares, so possession implies
-- consent. The student is notified when a school links them. A student can
-- have a parent AND a school at the same time; parent linking flows are
-- untouched.

CREATE OR REPLACE FUNCTION public.link_student_to_school(p_student_code text)
RETURNS TABLE (
  student_id uuid,
  full_name text,
  unique_id text,
  class_year text,
  parent_id uuid
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_school_id uuid;
  v_school_name text;
  v_student_id uuid;
  v_user_id uuid;
  v_current_school uuid;
BEGIN
  SELECT s.id, s.school_name
    INTO v_school_id, v_school_name
  FROM public.schools s
  WHERE s.user_id = auth.uid()
  LIMIT 1;
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Only schools can link students';
  END IF;

  SELECT st.id, st.user_id, st.school_id
    INTO v_student_id, v_user_id, v_current_school
  FROM public.students st
  JOIN public.profiles pf ON pf.id = st.user_id
  WHERE upper(pf.unique_id) = upper(trim(p_student_code))
  LIMIT 1;
  IF v_student_id IS NULL THEN
    RAISE EXCEPTION 'No student found with that link code';
  END IF;

  IF v_current_school IS NOT NULL AND v_current_school <> v_school_id THEN
    RAISE EXCEPTION 'Student is already linked to a school';
  END IF;

  IF v_current_school IS NULL THEN
    UPDATE public.students
    SET school_id = v_school_id,
        updated_at = now()
    WHERE id = v_student_id;

    INSERT INTO public.notifications (user_id, type, title, message)
    VALUES (
      v_user_id,
      'school_link',
      'School linked your account',
      COALESCE(v_school_name, 'A school')
        || ' linked your account using your link code. They can now follow your progress and set your class.'
    );
  END IF;

  RETURN QUERY
  SELECT st.id, pf.full_name, pf.unique_id, st.class_year::text, st.parent_id
  FROM public.students st
  JOIN public.profiles pf ON pf.id = st.user_id
  WHERE st.id = v_student_id;
END;
$$;

-- Undo path for mistaken adoptions: a school detaches a student it owns.
CREATE OR REPLACE FUNCTION public.unlink_student_from_school(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_school_id uuid;
BEGIN
  SELECT s.id INTO v_school_id
  FROM public.schools s
  WHERE s.user_id = auth.uid()
  LIMIT 1;
  IF v_school_id IS NULL THEN
    RAISE EXCEPTION 'Only schools can unlink students';
  END IF;

  UPDATE public.students
  SET school_id = NULL,
      class_id = NULL,
      updated_at = now()
  WHERE id = p_student_id
    AND school_id = v_school_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Student is not linked to your school';
  END IF;
END;
$$;

-- Codes are uppercase, but people type lowercase; make the exact match
-- case-insensitive to match lookup_parent_by_code behaviour.
CREATE OR REPLACE FUNCTION public.lookup_student_by_code(p_query text)
RETURNS TABLE (
  student_id uuid,
  user_id uuid,
  full_name text,
  username text,
  unique_id text,
  class_year text,
  parent_id uuid
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  WITH q AS (
    SELECT trim(p_query) AS exact
  ),
  needle AS (
    SELECT replace(replace(replace(trim(p_query), '\', '\\'), '%', '\%'), '_', '\_') AS pattern
  )
  SELECT s.id, s.user_id, pf.full_name, pf.username, pf.unique_id, s.class_year, s.parent_id
  FROM public.profiles pf
  JOIN public.students s ON s.user_id = pf.id
  CROSS JOIN q
  CROSS JOIN needle
  WHERE upper(pf.unique_id) = upper(q.exact)
     OR pf.username = lower(q.exact)
     OR (needle.pattern <> '' AND (
           pf.unique_id ILIKE needle.pattern || '%'
           OR pf.username ILIKE needle.pattern || '%'
         ))
  ORDER BY (upper(pf.unique_id) = upper(q.exact) OR pf.username = lower(q.exact)) DESC, pf.username ASC
  LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.link_student_to_school(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.unlink_student_from_school(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.link_student_to_school(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unlink_student_from_school(uuid) TO authenticated;
