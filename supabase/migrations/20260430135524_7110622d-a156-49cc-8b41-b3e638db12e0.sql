CREATE OR REPLACE FUNCTION public.get_admin_dashboard_summary()
RETURNS TABLE (
  total_accounts bigint,
  student_count bigint,
  completions_count bigint,
  total_points bigint
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    COALESCE((SELECT count(*) FROM public.user_roles), 0)::bigint AS total_accounts,
    COALESCE((SELECT count(*) FROM public.profiles), 0)::bigint AS student_count,
    COALESCE((SELECT count(*) FROM public.user_progress WHERE completed = true), 0)::bigint AS completions_count,
    COALESCE((SELECT sum(points) FROM public.user_points), 0)::bigint AS total_points
  WHERE private.is_full_access_staff(auth.uid()) OR private.is_limited_volunteer(auth.uid());
$$;