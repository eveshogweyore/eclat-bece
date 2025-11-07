-- Create quiz_results table to track all quiz completions
CREATE TABLE public.quiz_results (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject text NOT NULL,
  score decimal NOT NULL,
  total_questions integer NOT NULL,
  correct_answers integer NOT NULL,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create student_streaks table to track daily streaks
CREATE TABLE public.student_streaks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  student_id uuid NOT NULL REFERENCES public.students(id) ON DELETE CASCADE UNIQUE,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_activity_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quiz_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_streaks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for quiz_results
CREATE POLICY "Students can insert own quiz results"
  ON public.quiz_results
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = quiz_results.student_id
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can view own quiz results"
  ON public.quiz_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = quiz_results.student_id
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Parents can view their children's quiz results"
  ON public.quiz_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = quiz_results.student_id
      AND students.parent_id = auth.uid()
    )
  );

CREATE POLICY "Schools can view their students' quiz results"
  ON public.quiz_results
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = quiz_results.student_id
      AND students.school_id = auth.uid()
    )
  );

-- RLS Policies for student_streaks
CREATE POLICY "Students can view own streak"
  ON public.student_streaks
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = student_streaks.student_id
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can insert own streak"
  ON public.student_streaks
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = student_streaks.student_id
      AND students.user_id = auth.uid()
    )
  );

CREATE POLICY "Students can update own streak"
  ON public.student_streaks
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.students
      WHERE students.id = student_streaks.student_id
      AND students.user_id = auth.uid()
    )
  );

-- Function to update student streak
CREATE OR REPLACE FUNCTION public.update_student_streak(p_student_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_activity_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_today date := CURRENT_DATE;
  v_new_streak integer;
BEGIN
  -- Get current streak data or create if doesn't exist
  SELECT last_activity_date, current_streak, longest_streak
  INTO v_last_activity_date, v_current_streak, v_longest_streak
  FROM student_streaks
  WHERE student_id = p_student_id;

  -- If no streak record exists, create one
  IF NOT FOUND THEN
    INSERT INTO student_streaks (student_id, current_streak, longest_streak, last_activity_date, updated_at)
    VALUES (p_student_id, 1, 1, v_today, now());
    RETURN;
  END IF;

  -- If already practiced today, no need to update
  IF v_last_activity_date = v_today THEN
    RETURN;
  END IF;

  -- Calculate new streak
  IF v_last_activity_date = v_today - INTERVAL '1 day' THEN
    -- Consecutive day - increment streak
    v_new_streak := v_current_streak + 1;
  ELSE
    -- Streak broken - reset to 1
    v_new_streak := 1;
  END IF;

  -- Update streak record
  UPDATE student_streaks
  SET 
    current_streak = v_new_streak,
    longest_streak = GREATEST(longest_streak, v_new_streak),
    last_activity_date = v_today,
    updated_at = now()
  WHERE student_id = p_student_id;
END;
$$;

-- Trigger to update streak when quiz result is inserted
CREATE OR REPLACE FUNCTION public.handle_quiz_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update the student's streak
  PERFORM update_student_streak(NEW.student_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_quiz_result_created
  AFTER INSERT ON public.quiz_results
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_quiz_completion();

-- Create indexes for better performance
CREATE INDEX idx_quiz_results_student_id ON public.quiz_results(student_id);
CREATE INDEX idx_quiz_results_completed_at ON public.quiz_results(completed_at);
CREATE INDEX idx_student_streaks_student_id ON public.student_streaks(student_id);