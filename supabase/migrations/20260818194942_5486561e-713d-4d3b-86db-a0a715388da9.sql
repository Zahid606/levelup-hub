CREATE POLICY "Volunteers notify assigned students" ON public.notifications
  FOR INSERT TO authenticated
  WITH CHECK (private.is_assigned_volunteer(auth.uid(), user_id));

CREATE OR REPLACE FUNCTION public.notify_student_answered()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_TABLE_NAME = 'student_questions' THEN
    IF NEW.answer IS NOT NULL AND btrim(NEW.answer) <> '' AND COALESCE(OLD.answer, '') IS DISTINCT FROM NEW.answer THEN
      INSERT INTO public.notifications (user_id, type, title, message, lesson_id, link, dedupe_key)
      VALUES (NEW.student_id, 'answer', 'Your question was answered', left(NEW.answer, 160), NEW.lesson_id,
              CASE WHEN NEW.lesson_id IS NOT NULL THEN '/lesson/' || NEW.lesson_id::text ELSE '/' END,
              'answer:' || NEW.id::text)
      ON CONFLICT DO NOTHING;
    END IF;
  ELSE
    IF NEW.status = 'resolved' AND OLD.status IS DISTINCT FROM 'resolved' THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, dedupe_key)
      VALUES (NEW.student_id, 'answer', 'Your report was resolved', left(NEW.subject, 160), '/',
              'report_resolved:' || NEW.id::text)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_student_answered() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER student_questions_notify_answer
  AFTER UPDATE ON public.student_questions
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_answered();

CREATE TRIGGER student_reports_notify_resolved
  AFTER UPDATE ON public.student_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_student_answered();

CREATE OR REPLACE FUNCTION public.notify_students_quiz_available()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_lesson RECORD;
BEGIN
  SELECT id, title, is_published INTO v_lesson FROM public.lessons WHERE id = NEW.lesson_id;
  IF v_lesson.id IS NULL OR v_lesson.is_published IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, lesson_id, link, dedupe_key)
  SELECT ur.user_id, 'quiz_ready', 'New quiz available',
         'A quiz is ready in "' || v_lesson.title || '"', v_lesson.id,
         '/lesson/' || v_lesson.id::text, 'quiz_ready:' || v_lesson.id::text
  FROM public.user_roles ur
  WHERE ur.role = 'student'
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.notify_students_quiz_available() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER quiz_questions_notify_students
  AFTER INSERT ON public.quiz_questions
  FOR EACH ROW EXECUTE FUNCTION public.notify_students_quiz_available();