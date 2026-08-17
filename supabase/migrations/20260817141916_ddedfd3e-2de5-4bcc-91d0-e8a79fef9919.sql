
REVOKE ALL ON FUNCTION public.notify_students_video_ready() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_students_lesson_published() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_volunteers_student_activity() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.notify_staff_escalation() FROM public, anon, authenticated;
REVOKE ALL ON FUNCTION public.get_volunteer_dashboard_summary(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.get_volunteer_dashboard_summary(uuid) TO authenticated;
