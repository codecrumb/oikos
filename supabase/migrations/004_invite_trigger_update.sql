-- Update handle_new_user to also set household_id from invite metadata.
-- When an admin invites someone via email, the Edge Function passes household_id
-- as user metadata. This trigger reads it so the new member is auto-joined.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.members (id, display_name, avatar_color, household_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_color', '#6366f1'),
    NULLIF(NEW.raw_user_meta_data->>'household_id', '')::UUID
  );
  RETURN NEW;
END;
$$;
