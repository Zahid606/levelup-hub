-- Add updated_at to gifts and a gift_history audit log
ALTER TABLE public.gifts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();

DROP TRIGGER IF EXISTS update_gifts_updated_at ON public.gifts;
CREATE TRIGGER update_gifts_updated_at
BEFORE UPDATE ON public.gifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- History table to track gift changes
CREATE TABLE IF NOT EXISTS public.gift_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  gift_id UUID,
  user_id UUID NOT NULL,
  action TEXT NOT NULL, -- 'created' | 'updated' | 'deleted'
  gift_name TEXT,
  description TEXT,
  changed_by UUID,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.gift_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Full access staff can view gift history" ON public.gift_history;
CREATE POLICY "Full access staff can view gift history"
ON public.gift_history
FOR SELECT
TO authenticated
USING (private.is_full_access_staff(auth.uid()));

DROP POLICY IF EXISTS "Full access staff can insert gift history" ON public.gift_history;
CREATE POLICY "Full access staff can insert gift history"
ON public.gift_history
FOR INSERT
TO authenticated
WITH CHECK (private.is_full_access_staff(auth.uid()));

-- Trigger to auto-record gift changes
CREATE OR REPLACE FUNCTION public.record_gift_history()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.gift_history(gift_id, user_id, action, gift_name, description, changed_by)
    VALUES (NEW.id, NEW.user_id, 'created', NEW.gift_name, NEW.description, NEW.given_by);
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.gift_history(gift_id, user_id, action, gift_name, description, changed_by)
    VALUES (NEW.id, NEW.user_id, 'updated', NEW.gift_name, NEW.description, COALESCE(NEW.given_by, OLD.given_by));
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.gift_history(gift_id, user_id, action, gift_name, description, changed_by)
    VALUES (OLD.id, OLD.user_id, 'deleted', OLD.gift_name, OLD.description, OLD.given_by);
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS gifts_history_trg ON public.gifts;
CREATE TRIGGER gifts_history_trg
AFTER INSERT OR UPDATE OR DELETE ON public.gifts
FOR EACH ROW EXECUTE FUNCTION public.record_gift_history();