
-- =========================
-- Notifications
-- =========================
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
  link text,
  dedupe_key text,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR private.is_full_access_staff(auth.uid()));
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Staff can insert notifications" ON public.notifications
  FOR INSERT TO authenticated WITH CHECK (private.is_full_access_staff(auth.uid()));

CREATE UNIQUE INDEX notifications_dedupe_idx ON public.notifications(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX notifications_user_unread_idx ON public.notifications(user_id, read_at, created_at DESC);

ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- =========================
-- Volunteer assignments
-- =========================
CREATE TABLE public.volunteer_assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  assigned_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (volunteer_id, student_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_assignments TO authenticated;
GRANT ALL ON public.volunteer_assignments TO service_role;

ALTER TABLE public.volunteer_assignments ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION private.is_assigned_volunteer(_volunteer uuid, _student uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.volunteer_assignments
    WHERE volunteer_id = _volunteer AND student_id = _student
  );
$$;
REVOKE ALL ON FUNCTION private.is_assigned_volunteer(uuid, uuid) FROM public, anon, authenticated;

CREATE POLICY "Staff manage assignments" ON public.volunteer_assignments
  FOR ALL TO authenticated
  USING (private.is_full_access_staff(auth.uid()))
  WITH CHECK (private.is_full_access_staff(auth.uid()));
CREATE POLICY "Volunteers view own assignments" ON public.volunteer_assignments
  FOR SELECT TO authenticated USING (auth.uid() = volunteer_id OR auth.uid() = student_id);

CREATE INDEX volunteer_assignments_volunteer_idx ON public.volunteer_assignments(volunteer_id);
CREATE INDEX volunteer_assignments_student_idx ON public.volunteer_assignments(student_id);

-- =========================
-- Student questions
-- =========================
CREATE TABLE public.student_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  answered_by uuid,
  answered_at timestamptz,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_questions TO authenticated;
GRANT ALL ON public.student_questions TO service_role;

ALTER TABLE public.student_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own questions" ON public.student_questions
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Staff view questions" ON public.student_questions
  FOR SELECT TO authenticated
  USING (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id));
CREATE POLICY "Staff answer questions" ON public.student_questions
  FOR UPDATE TO authenticated
  USING (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id))
  WITH CHECK (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id));

CREATE TRIGGER student_questions_updated_at BEFORE UPDATE ON public.student_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Student reports
-- =========================
CREATE TABLE public.student_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  details text,
  severity text NOT NULL DEFAULT 'normal',
  status text NOT NULL DEFAULT 'open',
  escalated boolean NOT NULL DEFAULT false,
  handled_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_reports TO authenticated;
GRANT ALL ON public.student_reports TO service_role;

ALTER TABLE public.student_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own reports" ON public.student_reports
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Staff view reports" ON public.student_reports
  FOR SELECT TO authenticated
  USING (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id));
CREATE POLICY "Staff handle reports" ON public.student_reports
  FOR UPDATE TO authenticated
  USING (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id))
  WITH CHECK (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id));

CREATE TRIGGER student_reports_updated_at BEFORE UPDATE ON public.student_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================
-- Student feedback
-- =========================
CREATE TABLE public.student_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id uuid REFERENCES public.lessons(id) ON DELETE SET NULL,
  rating integer,
  message text,
  reviewed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_feedback TO authenticated;
GRANT ALL ON public.student_feedback TO service_role;

ALTER TABLE public.student_feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students manage own feedback" ON public.student_feedback
  FOR ALL TO authenticated
  USING (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);
CREATE POLICY "Staff view feedback" ON public.student_feedback
  FOR SELECT TO authenticated
  USING (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id));
CREATE POLICY "Staff review feedback" ON public.student_feedback
  FOR UPDATE TO authenticated
  USING (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id))
  WITH CHECK (private.is_full_access_staff(auth.uid()) OR private.is_assigned_volunteer(auth.uid(), student_id));

-- =========================
-- Notification helpers / triggers
-- =========================
CREATE OR REPLACE FUNCTION public.notify_students_video_ready()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_lesson RECORD;
BEGIN
  -- only when the video URL is actually present (upload finished) and lesson is published
  IF NEW.youtube_url IS NULL OR btrim(NEW.youtube_url) = '' THEN
    RETURN NEW;
  END IF;
  IF TG_OP = 'UPDATE' AND OLD.youtube_url IS NOT NULL AND btrim(OLD.youtube_url) <> '' THEN
    RETURN NEW;
  END IF;

  SELECT id, title, is_published INTO v_lesson FROM public.lessons WHERE id = NEW.lesson_id;
  IF v_lesson.id IS NULL OR v_lesson.is_published IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, lesson_id, link, dedupe_key)
  SELECT ur.user_id,
         'video_ready',
         'New video available',
         COALESCE(NEW.title, 'A new video') || ' is ready in "' || v_lesson.title || '"',
         v_lesson.id,
         '/lesson/' || v_lesson.id::text,
         'video_ready:' || NEW.id::text
  FROM public.user_roles ur
  WHERE ur.role = 'student'
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER lesson_content_notify_students
AFTER INSERT OR UPDATE OF youtube_url ON public.lesson_content
FOR EACH ROW EXECUTE FUNCTION public.notify_students_video_ready();

-- when a lesson becomes published, notify about its already-uploaded videos
CREATE OR REPLACE FUNCTION public.notify_students_lesson_published()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_published IS TRUE AND OLD.is_published IS DISTINCT FROM TRUE THEN
    INSERT INTO public.notifications (user_id, type, title, message, lesson_id, link, dedupe_key)
    SELECT ur.user_id,
           'video_ready',
           'New video available',
           COALESCE(lc.title, 'A new video') || ' is ready in "' || NEW.title || '"',
           NEW.id,
           '/lesson/' || NEW.id::text,
           'video_ready:' || lc.id::text
    FROM public.user_roles ur
    CROSS JOIN public.lesson_content lc
    WHERE ur.role = 'student'
      AND lc.lesson_id = NEW.id
      AND lc.youtube_url IS NOT NULL AND btrim(lc.youtube_url) <> ''
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER lessons_notify_published
AFTER UPDATE OF is_published ON public.lessons
FOR EACH ROW EXECUTE FUNCTION public.notify_students_lesson_published();

-- alert assigned volunteers (and staff) about new student activity
CREATE OR REPLACE FUNCTION public.notify_volunteers_student_activity()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_title text;
  v_message text;
  v_key text;
  v_student text;
BEGIN
  SELECT COALESCE(full_name, 'A student') INTO v_student FROM public.profiles WHERE user_id = NEW.student_id;
  v_student := COALESCE(v_student, 'A student');

  IF TG_TABLE_NAME = 'student_questions' THEN
    v_title := 'New student question';
    v_message := v_student || ' asked: ' || left(NEW.question, 140);
    v_key := 'question:' || NEW.id::text;
  ELSIF TG_TABLE_NAME = 'student_reports' THEN
    v_title := 'New student report';
    v_message := v_student || ' reported: ' || left(NEW.subject, 140);
    v_key := 'report:' || NEW.id::text;
  ELSE
    v_title := 'New student feedback';
    v_message := v_student || ' left feedback' || COALESCE(': ' || left(NEW.message, 140), '');
    v_key := 'feedback:' || NEW.id::text;
  END IF;

  INSERT INTO public.notifications (user_id, type, title, message, link, dedupe_key)
  SELECT va.volunteer_id, 'volunteer_alert', v_title, v_message, '/admin', v_key
  FROM public.volunteer_assignments va
  WHERE va.student_id = NEW.student_id
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER student_questions_notify AFTER INSERT ON public.student_questions
FOR EACH ROW EXECUTE FUNCTION public.notify_volunteers_student_activity();
CREATE TRIGGER student_reports_notify AFTER INSERT ON public.student_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_volunteers_student_activity();
CREATE TRIGGER student_feedback_notify AFTER INSERT ON public.student_feedback
FOR EACH ROW EXECUTE FUNCTION public.notify_volunteers_student_activity();

-- escalation alerts admins/managers
CREATE OR REPLACE FUNCTION public.notify_staff_escalation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.escalated IS TRUE AND OLD.escalated IS DISTINCT FROM TRUE THEN
    INSERT INTO public.notifications (user_id, type, title, message, link, dedupe_key)
    SELECT ur.user_id, 'escalation', 'Escalated report', left(NEW.subject, 160), '/admin', 'escalation:' || NEW.id::text
    FROM public.user_roles ur
    WHERE ur.role IN ('admin', 'manager')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER student_reports_escalation AFTER UPDATE OF escalated ON public.student_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_staff_escalation();

-- volunteer dashboard summary
CREATE OR REPLACE FUNCTION public.get_volunteer_dashboard_summary(_volunteer_id uuid)
RETURNS TABLE(student_count bigint, open_questions bigint, open_reports bigint, inactive_students bigint, new_feedback bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    (SELECT count(*) FROM public.volunteer_assignments WHERE volunteer_id = _volunteer_id),
    (SELECT count(*) FROM public.student_questions q
      JOIN public.volunteer_assignments va ON va.student_id = q.student_id
      WHERE va.volunteer_id = _volunteer_id AND q.status = 'open'),
    (SELECT count(*) FROM public.student_reports r
      JOIN public.volunteer_assignments va ON va.student_id = r.student_id
      WHERE va.volunteer_id = _volunteer_id AND r.status = 'open'),
    (SELECT count(*) FROM public.volunteer_assignments va
      WHERE va.volunteer_id = _volunteer_id
        AND NOT EXISTS (
          SELECT 1 FROM public.user_progress up
          WHERE up.user_id = va.student_id AND up.completed_at > now() - interval '14 days'
        )),
    (SELECT count(*) FROM public.student_feedback f
      JOIN public.volunteer_assignments va ON va.student_id = f.student_id
      WHERE va.volunteer_id = _volunteer_id AND f.reviewed = false)
  WHERE auth.uid() = _volunteer_id OR private.is_full_access_staff(auth.uid());
$$;
