-- Move role helpers out of the exposed public API schema
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
REVOKE ALL ON SCHEMA private FROM authenticated;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

CREATE OR REPLACE FUNCTION private.is_full_access_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_role(_user_id, 'admin'::public.app_role)
      OR private.has_role(_user_id, 'manager'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION private.is_limited_volunteer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, private
AS $$
  SELECT private.has_role(_user_id, 'volunteer'::public.app_role)
     AND NOT private.is_full_access_staff(_user_id)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_full_access_staff(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.is_limited_volunteer(uuid) FROM PUBLIC, anon, authenticated;

-- Replace public helper references in all table policies
DROP POLICY IF EXISTS "Full access staff can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Volunteers can add lessons" ON public.lessons;
DROP POLICY IF EXISTS "Authenticated users can view published lessons" ON public.lessons;
CREATE POLICY "Full access staff can manage lessons"
ON public.lessons
FOR ALL TO authenticated
USING (private.is_full_access_staff(auth.uid()))
WITH CHECK (private.is_full_access_staff(auth.uid()));
CREATE POLICY "Volunteers can add lessons"
ON public.lessons
FOR INSERT TO authenticated
WITH CHECK (private.is_limited_volunteer(auth.uid()));
CREATE POLICY "Authenticated users can view published lessons"
ON public.lessons
FOR SELECT TO authenticated
USING (is_published = true OR private.is_full_access_staff(auth.uid()) OR private.is_limited_volunteer(auth.uid()));

DROP POLICY IF EXISTS "Full access staff can manage content" ON public.lesson_content;
DROP POLICY IF EXISTS "Authenticated users can view lesson content" ON public.lesson_content;
CREATE POLICY "Full access staff can manage content"
ON public.lesson_content
FOR ALL TO authenticated
USING (private.is_full_access_staff(auth.uid()))
WITH CHECK (private.is_full_access_staff(auth.uid()));
CREATE POLICY "Authenticated users can view lesson content"
ON public.lesson_content
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Full access staff can manage questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated users can view questions" ON public.quiz_questions;
CREATE POLICY "Full access staff can manage questions"
ON public.quiz_questions
FOR ALL TO authenticated
USING (private.is_full_access_staff(auth.uid()))
WITH CHECK (private.is_full_access_staff(auth.uid()));
CREATE POLICY "Authenticated users can view questions"
ON public.quiz_questions
FOR SELECT TO authenticated
USING (true);

DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Full access staff can delete profiles" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.is_full_access_staff(auth.uid()) OR private.is_limited_volunteer(auth.uid()));
CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id OR private.is_full_access_staff(auth.uid()));
CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = user_id OR private.is_full_access_staff(auth.uid()))
WITH CHECK (auth.uid() = user_id OR private.is_full_access_staff(auth.uid()));
CREATE POLICY "Full access staff can delete profiles"
ON public.profiles
FOR DELETE TO authenticated
USING (private.is_full_access_staff(auth.uid()));

DROP POLICY IF EXISTS "Full access staff can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Full access staff can manage roles"
ON public.user_roles
FOR ALL TO authenticated
USING (private.is_full_access_staff(auth.uid()))
WITH CHECK (private.is_full_access_staff(auth.uid()));
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Full access staff can manage points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can insert own points" ON public.user_points;
CREATE POLICY "Full access staff can manage points"
ON public.user_points
FOR ALL TO authenticated
USING (private.is_full_access_staff(auth.uid()))
WITH CHECK (private.is_full_access_staff(auth.uid()));
CREATE POLICY "Users can view own points"
ON public.user_points
FOR SELECT TO authenticated
USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own points"
ON public.user_points
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Full access staff can view all progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can manage own progress" ON public.user_progress;
CREATE POLICY "Full access staff can view all progress"
ON public.user_progress
FOR SELECT TO authenticated
USING (private.is_full_access_staff(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Users can manage own progress"
ON public.user_progress
FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Full access staff can view all answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Users can insert own answers" ON public.quiz_answers;
CREATE POLICY "Full access staff can view all answers"
ON public.quiz_answers
FOR SELECT TO authenticated
USING (private.is_full_access_staff(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Users can insert own answers"
ON public.quiz_answers
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Full access staff can view all video completions" ON public.video_completions;
DROP POLICY IF EXISTS "Users can insert own video completions" ON public.video_completions;
CREATE POLICY "Full access staff can view all video completions"
ON public.video_completions
FOR SELECT TO authenticated
USING (private.is_full_access_staff(auth.uid()) OR auth.uid() = user_id);
CREATE POLICY "Users can insert own video completions"
ON public.video_completions
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Full access staff can manage gifts" ON public.gifts;
DROP POLICY IF EXISTS "Users can view own gifts" ON public.gifts;
CREATE POLICY "Full access staff can manage gifts"
ON public.gifts
FOR ALL TO authenticated
USING (private.is_full_access_staff(auth.uid()))
WITH CHECK (private.is_full_access_staff(auth.uid()));
CREATE POLICY "Users can view own gifts"
ON public.gifts
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

-- Remove exposed helper functions now that policies use private helpers
DROP FUNCTION IF EXISTS public.is_limited_volunteer(uuid);
DROP FUNCTION IF EXISTS public.is_full_access_staff(uuid);

-- Existing public security-definer helpers should not be directly callable by app clients
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;