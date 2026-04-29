GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_full_access_staff(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_limited_volunteer(uuid) TO authenticated;