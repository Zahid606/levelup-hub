
DELETE FROM public.video_completions a USING public.video_completions b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.content_id = b.content_id;

CREATE UNIQUE INDEX IF NOT EXISTS video_completions_user_content_uidx
  ON public.video_completions(user_id, content_id);

DELETE FROM public.user_progress a USING public.user_progress b
WHERE a.ctid < b.ctid AND a.user_id = b.user_id AND a.lesson_id = b.lesson_id;

CREATE UNIQUE INDEX IF NOT EXISTS user_progress_user_lesson_uidx
  ON public.user_progress(user_id, lesson_id);
