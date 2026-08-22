CREATE OR REPLACE FUNCTION public.notify_volunteers_quiz_failures()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_wrong int;
  v_student text;
  v_lesson_id uuid;
BEGIN
  IF NEW.is_correct THEN RETURN NEW; END IF;

  SELECT count(*) INTO v_wrong
  FROM public.quiz_answers qa
  WHERE qa.user_id = NEW.user_id AND qa.question_id = NEW.question_id AND qa.is_correct = false;

  IF v_wrong < 3 THEN RETURN NEW; END IF;

  SELECT lesson_id INTO v_lesson_id FROM public.quiz_questions WHERE id = NEW.question_id;
  SELECT COALESCE(full_name, 'A student') INTO v_student FROM public.profiles WHERE user_id = NEW.user_id;

  INSERT INTO public.notifications (user_id, type, title, message, lesson_id, link, dedupe_key)
  SELECT va.volunteer_id, 'volunteer_alert', 'Student struggling with a quiz',
         COALESCE(v_student, 'A student') || ' has failed the same quiz question ' || v_wrong || ' times',
         v_lesson_id,
         CASE WHEN v_lesson_id IS NOT NULL THEN '/lesson/' || v_lesson_id::text ELSE '/admin' END,
         'quizfail:' || NEW.user_id::text || ':' || NEW.question_id::text
  FROM public.volunteer_assignments va
  WHERE va.student_id = NEW.user_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS quiz_answers_notify_failures ON public.quiz_answers;
CREATE TRIGGER quiz_answers_notify_failures
AFTER INSERT ON public.quiz_answers
FOR EACH ROW EXECUTE FUNCTION public.notify_volunteers_quiz_failures();