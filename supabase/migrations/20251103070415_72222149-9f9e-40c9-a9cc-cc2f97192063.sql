-- Create quiz questions table
CREATE TABLE public.quiz_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  topic text,
  question_text text NOT NULL,
  correct_answer text NOT NULL,
  explanation text,
  difficulty text DEFAULT 'medium', -- 'easy', 'medium', 'hard'
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create quiz options table
CREATE TABLE public.quiz_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid REFERENCES public.quiz_questions(id) ON DELETE CASCADE NOT NULL,
  option_text text NOT NULL,
  is_correct boolean DEFAULT false,
  display_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;

-- RLS policies - quiz questions should be viewable by all authenticated users
CREATE POLICY "Authenticated users can view quiz questions"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can view quiz options"
ON public.quiz_options
FOR SELECT
TO authenticated
USING (true);

-- Add indexes for better query performance
CREATE INDEX idx_quiz_questions_subject ON public.quiz_questions(subject);
CREATE INDEX idx_quiz_questions_difficulty ON public.quiz_questions(difficulty);
CREATE INDEX idx_quiz_options_question_id ON public.quiz_options(question_id);

-- Create trigger for updating updated_at
CREATE TRIGGER update_quiz_questions_updated_at
BEFORE UPDATE ON public.quiz_questions
FOR EACH ROW
EXECUTE FUNCTION public.handle_updated_at();