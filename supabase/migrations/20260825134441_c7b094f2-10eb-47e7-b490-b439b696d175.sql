CREATE OR REPLACE FUNCTION public.get_message_contacts()
RETURNS TABLE(user_id uuid, full_name text, role text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH me AS (SELECT auth.uid() AS uid),
  candidates AS (
    -- admins/managers: everyone
    SELECT p.user_id
    FROM public.profiles p, me
    WHERE private.is_full_access_staff(me.uid) AND p.user_id <> me.uid
    UNION
    -- staff (admins/managers) are reachable by everyone
    SELECT ur.user_id
    FROM public.user_roles ur, me
    WHERE me.uid IS NOT NULL AND ur.role IN ('admin', 'manager') AND ur.user_id <> me.uid
    UNION
    -- volunteer <-> assigned student, both directions
    SELECT va.student_id FROM public.volunteer_assignments va, me WHERE va.volunteer_id = me.uid
    UNION
    SELECT va.volunteer_id FROM public.volunteer_assignments va, me WHERE va.student_id = me.uid
  )
  SELECT DISTINCT c.user_id,
         COALESCE(p.full_name, 'User'),
         COALESCE((SELECT ur.role::text FROM public.user_roles ur WHERE ur.user_id = c.user_id ORDER BY ur.role LIMIT 1), 'student')
  FROM candidates c
  LEFT JOIN public.profiles p ON p.user_id = c.user_id
  WHERE auth.uid() IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION public.get_message_contacts() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_message_contacts() TO authenticated;