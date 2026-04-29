-- Replace the limited view with a real limited table so Volunteers never need direct full-profile access
DROP VIEW IF EXISTS public.student_basic_profiles;

CREATE TABLE IF NOT EXISTS public.student_basic_profiles (
  user_id uuid PRIMARY KEY,
  full_name text,
  avatar_url text,
  language text NOT NULL DEFAULT 'en',
  gender text,
  age integer,
  city text,
  country text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.student_basic_profiles ENABLE ROW LEVEL SECURITY;

INSERT INTO public.student_basic_profiles (user_id, full_name, avatar_url, language, gender, age, city, country, created_at, updated_at)
SELECT user_id, full_name, avatar_url, language, gender, age, city, country, created_at, updated_at
FROM public.profiles
ON CONFLICT (user_id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  avatar_url = EXCLUDED.avatar_url,
  language = EXCLUDED.language,
  gender = EXCLUDED.gender,
  age = EXCLUDED.age,
  city = EXCLUDED.city,
  country = EXCLUDED.country,
  created_at = EXCLUDED.created_at,
  updated_at = EXCLUDED.updated_at;

CREATE OR REPLACE FUNCTION public.sync_student_basic_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.student_basic_profiles WHERE user_id = OLD.user_id;
    RETURN OLD;
  END IF;

  INSERT INTO public.student_basic_profiles (user_id, full_name, avatar_url, language, gender, age, city, country, created_at, updated_at)
  VALUES (NEW.user_id, NEW.full_name, NEW.avatar_url, NEW.language, NEW.gender, NEW.age, NEW.city, NEW.country, NEW.created_at, NEW.updated_at)
  ON CONFLICT (user_id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url,
    language = EXCLUDED.language,
    gender = EXCLUDED.gender,
    age = EXCLUDED.age,
    city = EXCLUDED.city,
    country = EXCLUDED.country,
    created_at = EXCLUDED.created_at,
    updated_at = EXCLUDED.updated_at;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_student_basic_profile_trigger ON public.profiles;
CREATE TRIGGER sync_student_basic_profile_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_student_basic_profile();

DROP POLICY IF EXISTS "Users can view basic student profiles" ON public.student_basic_profiles;
DROP POLICY IF EXISTS "Full access staff can manage basic student profiles" ON public.student_basic_profiles;

CREATE POLICY "Users can view basic student profiles"
ON public.student_basic_profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id OR private.is_full_access_staff(auth.uid()) OR private.is_limited_volunteer(auth.uid()));

CREATE POLICY "Full access staff can manage basic student profiles"
ON public.student_basic_profiles
FOR ALL
TO authenticated
USING (private.is_full_access_staff(auth.uid()))
WITH CHECK (private.is_full_access_staff(auth.uid()));

-- Volunteers must not read all full-profile rows directly.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.is_full_access_staff(auth.uid()));

REVOKE ALL ON FUNCTION public.sync_student_basic_profile() FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.student_basic_profiles TO authenticated;