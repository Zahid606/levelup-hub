ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS lesson_number integer;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS options_ur jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE public.quiz_questions ADD COLUMN IF NOT EXISTS options_bn jsonb NOT NULL DEFAULT '[]'::jsonb;