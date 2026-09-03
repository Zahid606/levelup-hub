DROP FUNCTION IF EXISTS public.get_volunteer_dashboard_summary(uuid);

REVOKE ALL ON FUNCTION public.get_message_contacts() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_message_contacts() TO service_role;