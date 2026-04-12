
-- Add city and country to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;

-- Add video_points to lesson_content
ALTER TABLE public.lesson_content ADD COLUMN IF NOT EXISTS video_points integer NOT NULL DEFAULT 10;

-- Create video_completions table
CREATE TABLE public.video_completions (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  content_id uuid NOT NULL REFERENCES public.lesson_content(id) ON DELETE CASCADE,
  completed_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(user_id, content_id)
);

ALTER TABLE public.video_completions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own video completions"
ON public.video_completions FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video completions"
ON public.video_completions FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all video completions"
ON public.video_completions FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));
