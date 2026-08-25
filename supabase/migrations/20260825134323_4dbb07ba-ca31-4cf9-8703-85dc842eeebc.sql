CREATE TABLE public.messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  body text NOT NULL,
  read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX messages_recipient_idx ON public.messages (recipient_id, created_at DESC);
CREATE INDEX messages_sender_idx ON public.messages (sender_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;

CREATE OR REPLACE FUNCTION private.can_message(_sender uuid, _recipient uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN _sender IS NULL OR _recipient IS NULL OR _sender = _recipient THEN false
    WHEN private.is_full_access_staff(_sender) THEN true
    WHEN private.is_full_access_staff(_recipient) THEN true
    WHEN EXISTS (
      SELECT 1 FROM public.volunteer_assignments va
      WHERE (va.volunteer_id = _sender AND va.student_id = _recipient)
         OR (va.volunteer_id = _recipient AND va.student_id = _sender)
    ) THEN true
    ELSE false
  END
$$;

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants and staff can read messages"
ON public.messages FOR SELECT TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid() OR private.is_full_access_staff(auth.uid()));

CREATE POLICY "Users can send permitted messages"
ON public.messages FOR INSERT TO authenticated
WITH CHECK (sender_id = auth.uid() AND private.can_message(auth.uid(), recipient_id));

CREATE POLICY "Recipients can mark messages read"
ON public.messages FOR UPDATE TO authenticated
USING (recipient_id = auth.uid())
WITH CHECK (recipient_id = auth.uid());

CREATE POLICY "Only admins and managers can delete messages"
ON public.messages FOR DELETE TO authenticated
USING (private.is_full_access_staff(auth.uid()));

CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender text;
BEGIN
  SELECT COALESCE(full_name, 'Someone') INTO v_sender FROM public.profiles WHERE user_id = NEW.sender_id;
  INSERT INTO public.notifications (user_id, type, title, message, link, dedupe_key)
  VALUES (NEW.recipient_id, 'message', 'New message from ' || COALESCE(v_sender, 'Someone'),
          left(NEW.body, 160), '/messages', 'message:' || NEW.id::text)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER messages_notify_recipient
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();