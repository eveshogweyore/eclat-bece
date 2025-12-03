-- Create Year 6 Comprehension Passages Table
CREATE TABLE public.comprehension_passages_year6 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  passage_text TEXT NOT NULL,
  subject TEXT DEFAULT 'English Language',
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create Year 9 Comprehension Passages Table
CREATE TABLE public.comprehension_passages_year9 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT,
  passage_text TEXT NOT NULL,
  subject TEXT DEFAULT 'English Language',
  topic TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add passage_id to questions tables
ALTER TABLE public.quiz_questions_year6 
ADD COLUMN passage_id UUID REFERENCES public.comprehension_passages_year6(id) ON DELETE SET NULL;

ALTER TABLE public.quiz_questions_year9 
ADD COLUMN passage_id UUID REFERENCES public.comprehension_passages_year9(id) ON DELETE SET NULL;

-- Create indexes for efficient querying
CREATE INDEX idx_quiz_questions_year6_passage ON public.quiz_questions_year6(passage_id);
CREATE INDEX idx_quiz_questions_year9_passage ON public.quiz_questions_year9(passage_id);
CREATE INDEX idx_comprehension_passages_year6_topic ON public.comprehension_passages_year6(topic);
CREATE INDEX idx_comprehension_passages_year9_topic ON public.comprehension_passages_year9(topic);

-- Enable RLS
ALTER TABLE public.comprehension_passages_year6 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.comprehension_passages_year9 ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Year 6 Passages
CREATE POLICY "Authenticated users can view year 6 passages"
  ON public.comprehension_passages_year6 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert year 6 passages"
  ON public.comprehension_passages_year6 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can update year 6 passages"
  ON public.comprehension_passages_year6 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can delete year 6 passages"
  ON public.comprehension_passages_year6 
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );

-- RLS Policies for Year 9 Passages
CREATE POLICY "Authenticated users can view year 9 passages"
  ON public.comprehension_passages_year9 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can insert year 9 passages"
  ON public.comprehension_passages_year9 
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can update year 9 passages"
  ON public.comprehension_passages_year9 
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );

CREATE POLICY "Admins can delete year 9 passages"
  ON public.comprehension_passages_year9 
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM public.admins
      WHERE user_id = auth.uid()
        AND is_active = TRUE
    )
  );
