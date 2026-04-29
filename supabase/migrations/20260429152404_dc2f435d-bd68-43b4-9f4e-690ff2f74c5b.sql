-- Helper functions for role checks
CREATE OR REPLACE FUNCTION public.is_full_access_staff(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'admin'::public.app_role)
      OR public.has_role(_user_id, 'manager'::public.app_role)
$$;

CREATE OR REPLACE FUNCTION public.is_limited_volunteer(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.has_role(_user_id, 'volunteer'::public.app_role)
     AND NOT public.is_full_access_staff(_user_id)
$$;

-- Limited student profile view for volunteer users
CREATE OR REPLACE VIEW public.student_basic_profiles
WITH (security_invoker = true)
AS
SELECT
  id,
  user_id,
  full_name,
  avatar_url,
  language,
  gender,
  age,
  city,
  country,
  created_at,
  updated_at
FROM public.profiles;

-- Lessons: Admin/Manager full control, Volunteers can add lessons only, authenticated users can view published lessons
DROP POLICY IF EXISTS "Admins can manage lessons" ON public.lessons;
DROP POLICY IF EXISTS "Anyone can view published lessons" ON public.lessons;

CREATE POLICY "Full access staff can manage lessons"
ON public.lessons
FOR ALL
TO authenticated
USING (public.is_full_access_staff(auth.uid()))
WITH CHECK (public.is_full_access_staff(auth.uid()));

CREATE POLICY "Volunteers can add lessons"
ON public.lessons
FOR INSERT
TO authenticated
WITH CHECK (public.is_limited_volunteer(auth.uid()));

CREATE POLICY "Authenticated users can view published lessons"
ON public.lessons
FOR SELECT
TO authenticated
USING (is_published = true OR public.is_full_access_staff(auth.uid()) OR public.is_limited_volunteer(auth.uid()));

-- Lesson content: Admin/Manager only for changes, all authenticated users can view
DROP POLICY IF EXISTS "Admins can manage content" ON public.lesson_content;
DROP POLICY IF EXISTS "Authenticated can view content" ON public.lesson_content;

CREATE POLICY "Full access staff can manage content"
ON public.lesson_content
FOR ALL
TO authenticated
USING (public.is_full_access_staff(auth.uid()))
WITH CHECK (public.is_full_access_staff(auth.uid()));

CREATE POLICY "Authenticated users can view lesson content"
ON public.lesson_content
FOR SELECT
TO authenticated
USING (true);

-- Quiz questions: Admin/Manager only for changes, all authenticated users can view
DROP POLICY IF EXISTS "Admins can manage questions" ON public.quiz_questions;
DROP POLICY IF EXISTS "Authenticated can view questions" ON public.quiz_questions;

CREATE POLICY "Full access staff can manage questions"
ON public.quiz_questions
FOR ALL
TO authenticated
USING (public.is_full_access_staff(auth.uid()))
WITH CHECK (public.is_full_access_staff(auth.uid()));

CREATE POLICY "Authenticated users can view questions"
ON public.quiz_questions
FOR SELECT
TO authenticated
USING (true);

-- Profiles: Admin/Manager can manage all. Volunteers can view only through the limited view above; users can manage own profile.
DROP POLICY IF EXISTS "Users can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Full access staff can view all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Full access staff can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Full access staff can delete profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;

CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR public.is_full_access_staff(auth.uid()) OR public.is_limited_volunteer(auth.uid()));

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id OR public.is_full_access_staff(auth.uid()));

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id OR public.is_full_access_staff(auth.uid()))
WITH CHECK (auth.uid() = user_id OR public.is_full_access_staff(auth.uid()));

CREATE POLICY "Full access staff can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_full_access_staff(auth.uid()));

-- User roles: Admin/Manager manage staff roles. Users can only view their own role.
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can view all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;

CREATE POLICY "Full access staff can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.is_full_access_staff(auth.uid()))
WITH CHECK (public.is_full_access_staff(auth.uid()));

CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Points: Admin/Manager can manage all, users can view/insert own points only.
DROP POLICY IF EXISTS "Admins can manage points" ON public.user_points;
DROP POLICY IF EXISTS "Users can insert own points" ON public.user_points;
DROP POLICY IF EXISTS "Users can view own points" ON public.user_points;

CREATE POLICY "Full access staff can manage points"
ON public.user_points
FOR ALL
TO authenticated
USING (public.is_full_access_staff(auth.uid()))
WITH CHECK (public.is_full_access_staff(auth.uid()));

CREATE POLICY "Users can view own points"
ON public.user_points
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own points"
ON public.user_points
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Progress: Admin/Manager can view all, users can manage own progress only.
DROP POLICY IF EXISTS "Admins can view all progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can manage own progress" ON public.user_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON public.user_progress;

CREATE POLICY "Full access staff can view all progress"
ON public.user_progress
FOR SELECT
TO authenticated
USING (public.is_full_access_staff(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Users can manage own progress"
ON public.user_progress
FOR ALL
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Quiz answers: Admin/Manager can view all, users can view/insert own answers only.
DROP POLICY IF EXISTS "Admins can view all answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Users can insert own answers" ON public.quiz_answers;
DROP POLICY IF EXISTS "Users can view own answers" ON public.quiz_answers;

CREATE POLICY "Full access staff can view all answers"
ON public.quiz_answers
FOR SELECT
TO authenticated
USING (public.is_full_access_staff(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Users can insert own answers"
ON public.quiz_answers
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Video completions: Admin/Manager can view all, users can view/insert own completions only.
DROP POLICY IF EXISTS "Admins can view all video completions" ON public.video_completions;
DROP POLICY IF EXISTS "Users can insert own video completions" ON public.video_completions;
DROP POLICY IF EXISTS "Users can view own video completions" ON public.video_completions;

CREATE POLICY "Full access staff can view all video completions"
ON public.video_completions
FOR SELECT
TO authenticated
USING (public.is_full_access_staff(auth.uid()) OR auth.uid() = user_id);

CREATE POLICY "Users can insert own video completions"
ON public.video_completions
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Gifts: Admin/Manager can manage, users can view their own gifts only.
DROP POLICY IF EXISTS "Admins can manage gifts" ON public.gifts;
DROP POLICY IF EXISTS "Users can view own gifts" ON public.gifts;

CREATE POLICY "Full access staff can manage gifts"
ON public.gifts
FOR ALL
TO authenticated
USING (public.is_full_access_staff(auth.uid()))
WITH CHECK (public.is_full_access_staff(auth.uid()));

CREATE POLICY "Users can view own gifts"
ON public.gifts
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

GRANT SELECT ON public.student_basic_profiles TO authenticated;