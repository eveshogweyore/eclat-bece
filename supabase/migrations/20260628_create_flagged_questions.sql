-- Create table to track flagged questions reported by students
-- Allows students to report typos, incorrect answers, missing images, etc.

BEGIN;

CREATE TABLE IF NOT EXISTS public.flagged_questions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
    class_year TEXT NOT NULL, -- 'year_6' | 'year_9'
    question_id UUID NOT NULL, -- ID of the flagged question
    subject TEXT NOT NULL,
    topic TEXT,
    question_text TEXT NOT NULL, -- Cached copy of question content
    reason TEXT NOT NULL, -- 'incorrect_answer' | 'typo' | 'missing_image' | 'incomplete' | 'other'
    details TEXT, -- Optional freeform student description
    status TEXT DEFAULT 'pending', -- 'pending' | 'resolved' | 'dismissed'
    created_at TIMESTAMPTZ DEFAULT now(),
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.profiles(id)
);

-- Enable Row Level Security (RLS)
ALTER TABLE public.flagged_questions ENABLE ROW LEVEL SECURITY;

-- Allow students to submit flags
CREATE POLICY "Students can insert flags" 
ON public.flagged_questions FOR INSERT 
TO authenticated 
WITH CHECK (true);

-- Allow admins to perform all operations on flags
CREATE POLICY "Admins can view and manage flags" 
ON public.flagged_questions FOR ALL 
TO authenticated 
USING (exists (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role::text = 'admin'
));

COMMIT;
