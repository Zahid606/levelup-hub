
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, gender, age, city, country)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.raw_user_meta_data->>'gender',
    CASE WHEN NEW.raw_user_meta_data->>'age' IS NOT NULL 
         THEN (NEW.raw_user_meta_data->>'age')::integer 
         ELSE NULL END,
    NEW.raw_user_meta_data->>'city',
    NEW.raw_user_meta_data->>'country'
  );
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;
