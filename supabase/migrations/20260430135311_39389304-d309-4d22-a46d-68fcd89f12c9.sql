CREATE OR REPLACE FUNCTION public.get_student_dashboard_summary(_user_id uuid)
RETURNS TABLE (
  completed_count bigint,
  total_points bigint,
  gift_count bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT count(*) FROM public.user_progress WHERE user_id = _user_id AND completed = true), 0)::bigint AS completed_count,
    COALESCE((SELECT sum(points) FROM public.user_points WHERE user_id = _user_id), 0)::bigint AS total_points,
    COALESCE((SELECT count(*) FROM public.gifts WHERE user_id = _user_id), 0)::bigint AS gift_count
  WHERE auth.uid() = _user_id OR private.is_full_access_staff(auth.uid()) OR private.is_limited_volunteer(auth.uid());
$$;