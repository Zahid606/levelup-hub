-- =============================================================================
-- Messaging v2
-- Run this whole file once in the Supabase SQL Editor. It is safe to run again.
-- It never deletes or rewrites existing messages.
--
-- What it fixes
--   1. Students could not load their contact list (permission denied), so they
--      had nobody to send a message to.
--   2. A message went to ONE named admin; other admins/managers never saw it and
--      were never notified. Messages to staff now form a shared "Admin Team"
--      inbox: every admin/manager can see, answer and be notified.
--   3. Recipients could rewrite the text of messages sent to them. Only the
--      read marker can be changed now.
--   4. Adds an unread-message counter and profile pictures for the chat.
-- =============================================================================

-- 0) Stop early, with a readable message, if an older setup step is missing --------
DO $$
DECLARE
  missing text[] := ARRAY[]::text[];
BEGIN
  IF to_regclass('public.messages') IS NULL THEN missing := array_append(missing, 'table public.messages'); END IF;
  IF to_regclass('public.notifications') IS NULL THEN missing := array_append(missing, 'table public.notifications'); END IF;
  IF to_regclass('public.profiles') IS NULL THEN missing := array_append(missing, 'table public.profiles'); END IF;
  IF to_regclass('public.user_roles') IS NULL THEN missing := array_append(missing, 'table public.user_roles'); END IF;
  IF to_regclass('public.volunteer_assignments') IS NULL THEN missing := array_append(missing, 'table public.volunteer_assignments'); END IF;
  IF to_regprocedure('private.is_full_access_staff(uuid)') IS NULL THEN missing := array_append(missing, 'function private.is_full_access_staff'); END IF;
  IF to_regprocedure('private.can_message(uuid,uuid)') IS NULL THEN missing := array_append(missing, 'function private.can_message'); END IF;
  IF array_length(missing, 1) > 0 THEN
    RAISE EXCEPTION 'Messaging setup cannot run yet. Missing: %. Run the earlier migrations in supabase/migrations first.', array_to_string(missing, ', ');
  END IF;
END $$;

-- 1) Permissions the chat relies on ------------------------------------------
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_full_access_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.can_message(uuid, uuid) TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.messages TO authenticated;
GRANT ALL ON public.messages TO service_role;
REVOKE ALL ON public.messages FROM anon;

-- Only the "read" marker may be changed after a message is sent.
REVOKE UPDATE ON public.messages FROM authenticated;
GRANT UPDATE (read_at) ON public.messages TO authenticated;

-- 2) Messages must have text (existing rows are left untouched) ----------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'messages_body_length' AND conrelid = 'public.messages'::regclass
  ) THEN
    ALTER TABLE public.messages
      ADD CONSTRAINT messages_body_length
      CHECK (char_length(btrim(body)) BETWEEN 1 AND 4000) NOT VALID;
  END IF;
END $$;

-- 3) Read receipts: the recipient, or any admin/manager for the shared inbox ----
DROP POLICY IF EXISTS "Recipients can mark messages read" ON public.messages;
DROP POLICY IF EXISTS "Recipients and staff can mark messages read" ON public.messages;
CREATE POLICY "Recipients and staff can mark messages read"
ON public.messages FOR UPDATE TO authenticated
USING (
  recipient_id = auth.uid()
  OR (private.is_full_access_staff(auth.uid()) AND private.is_full_access_staff(recipient_id))
)
WITH CHECK (
  recipient_id = auth.uid()
  OR (private.is_full_access_staff(auth.uid()) AND private.is_full_access_staff(recipient_id))
);

-- 4) Notifications: tell every admin/manager when a student writes to the team --
CREATE OR REPLACE FUNCTION public.notify_new_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sender text;
  v_sender_staff boolean;
  v_recipient_staff boolean;
BEGIN
  BEGIN
    SELECT COALESCE(NULLIF(btrim(full_name), ''), 'Someone') INTO v_sender
    FROM public.profiles WHERE user_id = NEW.sender_id;
    v_sender := COALESCE(v_sender, 'Someone');

    v_sender_staff := EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.sender_id AND role IN ('admin', 'manager'));
    v_recipient_staff := EXISTS (
      SELECT 1 FROM public.user_roles WHERE user_id = NEW.recipient_id AND role IN ('admin', 'manager'));

    IF v_recipient_staff AND NOT v_sender_staff THEN
      INSERT INTO public.notifications (user_id, type, title, message, link, dedupe_key)
      SELECT DISTINCT ur.user_id, 'message', 'New message from ' || v_sender,
             left(NEW.body, 160), '/messages', 'message:' || NEW.id::text
      FROM public.user_roles ur
      WHERE ur.role IN ('admin', 'manager') AND ur.user_id <> NEW.sender_id
      ON CONFLICT DO NOTHING;
    ELSE
      INSERT INTO public.notifications (user_id, type, title, message, link, dedupe_key)
      VALUES (NEW.recipient_id, 'message', 'New message from ' || v_sender,
              left(NEW.body, 160), '/messages', 'message:' || NEW.id::text)
      ON CONFLICT DO NOTHING;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- A notification problem must never stop the message from being saved.
    RAISE WARNING 'notify_new_message failed: %', SQLERRM;
  END;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.notify_new_message() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS messages_notify_recipient ON public.messages;
CREATE TRIGGER messages_notify_recipient
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.notify_new_message();

-- 5) Contacts: who the signed-in person can message (with profile picture) -----
DROP FUNCTION IF EXISTS public.get_message_contacts();
CREATE FUNCTION public.get_message_contacts()
RETURNS TABLE(user_id uuid, full_name text, role text, avatar_url text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  staff AS (SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('admin', 'manager')),
  candidates AS (
    -- admins/managers can message everyone
    SELECT p.user_id FROM public.profiles p, me
    WHERE me.uid IN (SELECT s.user_id FROM staff s) AND p.user_id <> me.uid
    UNION
    -- everyone can reach the admin team
    SELECT s.user_id FROM staff s, me WHERE me.uid IS NOT NULL AND s.user_id <> me.uid
    UNION
    -- volunteer <-> assigned student, both directions
    SELECT va.student_id FROM public.volunteer_assignments va, me WHERE va.volunteer_id = me.uid
    UNION
    SELECT va.volunteer_id FROM public.volunteer_assignments va, me WHERE va.student_id = me.uid
  )
  SELECT c.user_id,
         COALESCE(NULLIF(btrim(p.full_name), ''), 'User') AS full_name,
         COALESCE((
           SELECT r.role::text FROM public.user_roles r WHERE r.user_id = c.user_id
           ORDER BY CASE r.role::text WHEN 'admin' THEN 1 WHEN 'manager' THEN 2
                                      WHEN 'volunteer' THEN 3 WHEN 'employee' THEN 4 ELSE 5 END
           LIMIT 1), 'student') AS role,
         p.avatar_url
  FROM candidates c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE (SELECT uid FROM me) IS NOT NULL
  ORDER BY 2;
$$;
REVOKE ALL ON FUNCTION public.get_message_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_message_contacts() TO authenticated, service_role;

-- 6) Unread counter for the menu badge ------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unread_message_count()
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  staff AS (SELECT DISTINCT ur.user_id FROM public.user_roles ur WHERE ur.role IN ('admin', 'manager'))
  SELECT COALESCE(COUNT(*), 0)::int
  FROM public.messages m, me
  WHERE me.uid IS NOT NULL
    AND m.read_at IS NULL
    AND (
      m.recipient_id = me.uid
      OR (
        me.uid IN (SELECT s.user_id FROM staff s)
        AND m.recipient_id IN (SELECT s.user_id FROM staff s)
        AND m.sender_id NOT IN (SELECT s.user_id FROM staff s)
      )
    );
$$;
REVOKE ALL ON FUNCTION public.get_unread_message_count() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_unread_message_count() TO authenticated, service_role;

-- 7) Live updates ---------------------------------------------------------------
ALTER TABLE public.messages REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  END IF;
END $$;
