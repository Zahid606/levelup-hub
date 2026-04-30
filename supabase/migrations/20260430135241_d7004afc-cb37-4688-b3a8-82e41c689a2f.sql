CREATE INDEX IF NOT EXISTS idx_lessons_published_order
ON public.lessons (is_published, lesson_number, created_at);

CREATE INDEX IF NOT EXISTS idx_lesson_content_lesson_order
ON public.lesson_content (lesson_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson_order
ON public.quiz_questions (lesson_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_user_points_user_id
ON public.user_points (user_id);

CREATE INDEX IF NOT EXISTS idx_user_points_user_created
ON public.user_points (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_gifts_user_created
ON public.gifts (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_quiz_answers_user_id
ON public.quiz_answers (user_id);

CREATE INDEX IF NOT EXISTS idx_video_completions_user_id
ON public.video_completions (user_id);

CREATE INDEX IF NOT EXISTS idx_profiles_created_at
ON public.profiles (created_at DESC);

CREATE OR REPLACE FUNCTION public.get_student_dashboard_summary(_user_id uuid)
RETURNS TABLE (
  completed_count bigint,
  total_points bigint,
  gift_count bigint
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT count(*) FROM public.user_progress WHERE user_id = _user_id AND completed = true), 0)::bigint AS completed_count,
    COALESCE((SELECT sum(points) FROM public.user_points WHERE user_id = _user_id), 0)::bigint AS total_points,
    COALESCE((SELECT count(*) FROM public.gifts WHERE user_id = _user_id), 0)::bigint AS gift_count
  WHERE auth.uid() = _user_id OR private.is_full_access_staff(auth.uid()) OR private.is_limited_volunteer(auth.uid());
$$;