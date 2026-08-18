ALTER TABLE public.user_roles ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

CREATE TABLE IF NOT EXISTS public.volunteer_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  volunteer_id uuid NOT NULL,
  student_id uuid NOT NULL,
  report_date date NOT NULL DEFAULT current_date,
  present boolean NOT NULL DEFAULT true,
  rating integer NOT NULL DEFAULT 3,
  progress text,
  behaviour text,
  problem text,
  has_problem boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.volunteer_reports TO authenticated;
GRANT ALL ON public.volunteer_reports TO service_role;

ALTER TABLE public.volunteer_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "staff and assigned volunteers can read reports"
  ON public.volunteer_reports FOR SELECT TO authenticated
  USING (private.is_full_access_staff(auth.uid()) OR volunteer_id = auth.uid());

CREATE POLICY "assigned volunteers can create reports"
  ON public.volunteer_reports FOR INSERT TO authenticated
  WITH CHECK (
    private.is_full_access_staff(auth.uid())
    OR (volunteer_id = auth.uid() AND private.is_assigned_volunteer(auth.uid(), student_id))
  );

CREATE POLICY "owners and staff can update reports"
  ON public.volunteer_reports FOR UPDATE TO authenticated
  USING (private.is_full_access_staff(auth.uid()) OR volunteer_id = auth.uid())
  WITH CHECK (private.is_full_access_staff(auth.uid()) OR volunteer_id = auth.uid());

CREATE POLICY "staff can delete reports"
  ON public.volunteer_reports FOR DELETE TO authenticated
  USING (private.is_full_access_staff(auth.uid()));

CREATE TRIGGER volunteer_reports_updated_at
  BEFORE UPDATE ON public.volunteer_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS volunteer_reports_volunteer_idx ON public.volunteer_reports(volunteer_id);
CREATE INDEX IF NOT EXISTS volunteer_reports_student_idx ON public.volunteer_reports(student_id);

-- notify admins/managers when a volunteer submits a report
CREATE OR REPLACE FUNCTION public.notify_admins_volunteer_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student text;
  v_volunteer text;
BEGIN
  SELECT COALESCE(full_name, 'A student') INTO v_student FROM public.profiles WHERE user_id = NEW.student_id;
  SELECT COALESCE(full_name, 'A volunteer') INTO v_volunteer FROM public.profiles WHERE user_id = NEW.volunteer_id;

  INSERT INTO public.notifications (user_id, type, title, message, link, dedupe_key)
  SELECT ur.user_id,
         CASE WHEN NEW.has_problem THEN 'escalation' ELSE 'volunteer_report' END,
         CASE WHEN NEW.has_problem THEN 'Student problem reported' ELSE 'New volunteer report' END,
         COALESCE(v_volunteer, 'A volunteer') || ' reported on ' || COALESCE(v_student, 'a student')
           || ' (' || CASE WHEN NEW.present THEN 'present' ELSE 'absent' END || ', ' || NEW.rating::text || '/5)'
           || COALESCE(' — ' || left(NEW.problem, 120), ''),
         '/admin',
         'vreport:' || NEW.id::text
  FROM public.user_roles ur
  WHERE ur.role IN ('admin', 'manager')
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

CREATE TRIGGER volunteer_reports_notify_admins
  AFTER INSERT ON public.volunteer_reports
  FOR EACH ROW EXECUTE FUNCTION public.notify_admins_volunteer_report();

-- notify volunteer when a student is assigned to them
CREATE OR REPLACE FUNCTION public.notify_volunteer_assignment()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_student text;
BEGIN
  SELECT COALESCE(full_name, 'A student') INTO v_student FROM public.profiles WHERE user_id = NEW.student_id;
  INSERT INTO public.notifications (user_id, type, title, message, link, dedupe_key)
  VALUES (NEW.volunteer_id, 'volunteer_alert', 'New student assigned',
          COALESCE(v_student, 'A student') || ' has been assigned to you', '/admin',
          'assignment:' || NEW.id::text)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER volunteer_assignments_notify
  AFTER INSERT ON public.volunteer_assignments
  FOR EACH ROW EXECUTE FUNCTION public.notify_volunteer_assignment();