-- Normalize duplicate/inconsistently-formatted topics in the database
-- Trims leading/trailing spaces and standardizes en-dashes, hyphens, and spelling.

BEGIN;

-- 1. Trim leading and trailing spaces from all topics
UPDATE public.quiz_questions_year6 SET topic = TRIM(topic);
UPDATE public.quiz_questions_year9 SET topic = TRIM(topic);

-- 2. Normalize "Number & Numeration - Factors / HCF / LCM"
UPDATE public.quiz_questions_year6
SET topic = 'Number & Numeration - Factors / HCF / LCM'
WHERE topic IN (
  'Number & Numeration – Factors / HCF / LCM',
  'Number & Numeration - Factors / HCF/ LCM',
  'Number & Numeration -Factors  / HCF/ LCM',
  'Number & Numeration -Factors / HCF/ LCM',
  'Number & Numeration -Factors /HCF/ LCM',
  E'\tNumber & Numeration – Factors / HCF / LCM'
);

-- 3. Normalize "Number & Numeration - Place Value"
UPDATE public.quiz_questions_year6
SET topic = 'Number & Numeration - Place Value'
WHERE topic IN (
  'Number & Numeration – Place Value',
  'Number & Numeration Place Value',
  'Number & Numeration Place Value,',
  'Number & Numeration Place Value, ',
  'Number & Numeration - Place Value'
);

-- 4. Normalize "Number & Numeration - Multiples"
UPDATE public.quiz_questions_year6
SET topic = 'Number & Numeration - Multiples'
WHERE topic IN (
  'Number & Numeration – Multiples',
  'Number & Numeration -Multiples'
);

-- 5. Normalize "Ratio and Proportion"
UPDATE public.quiz_questions_year6
SET topic = 'Ratio and Proportion'
WHERE topic IN (
  'Ratio and proportion'
);

COMMIT;
