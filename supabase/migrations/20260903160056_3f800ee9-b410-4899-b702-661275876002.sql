CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL UNIQUE,
  p256dh text NOT NULL,
  auth text NOT NULL,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.push_subscriptions TO authenticated;
GRANT ALL ON public.push_subscriptions TO service_role;

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage their own push subscriptions" ON public.push_subscriptions;
CREATE POLICY "Users manage their own push subscriptions"
ON public.push_subscriptions FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_push_subscriptions_user ON public.push_subscriptions(user_id);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON public.notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_sender_created ON public.messages(sender_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_recipient_created ON public.messages(recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_progress_user ON public.user_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_progress_lesson ON public.user_progress(lesson_id);
CREATE INDEX IF NOT EXISTS idx_user_points_user ON public.user_points(user_id);
CREATE INDEX IF NOT EXISTS idx_quiz_answers_user_question ON public.quiz_answers(user_id, question_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_lesson ON public.quiz_questions(lesson_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_lesson_content_lesson ON public.lesson_content(lesson_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_video_completions_user ON public.video_completions(user_id);
CREATE INDEX IF NOT EXISTS idx_lessons_published_number ON public.lessons(is_published, lesson_number);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_volunteer ON public.volunteer_assignments(volunteer_id);
CREATE INDEX IF NOT EXISTS idx_volunteer_assignments_student ON public.volunteer_assignments(student_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user ON public.user_roles(user_id);