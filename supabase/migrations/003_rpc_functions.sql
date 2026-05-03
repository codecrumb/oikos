-- RPC functions for household management.
-- These run with SECURITY DEFINER so they bypass RLS safely
-- while still verifying the caller via auth.uid().

CREATE OR REPLACE FUNCTION public.create_household(p_name TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_household_id UUID;
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  INSERT INTO public.households (name)
  VALUES (p_name)
  RETURNING id INTO v_household_id;

  UPDATE public.members
  SET household_id = v_household_id, role = 'admin'
  WHERE id = v_user_id;

  RETURN jsonb_build_object('id', v_household_id, 'name', p_name);
END;
$$;

CREATE OR REPLACE FUNCTION public.join_household(p_household_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID := auth.uid();
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.households WHERE id = p_household_id) THEN
    RAISE EXCEPTION 'Household not found';
  END IF;

  UPDATE public.members
  SET household_id = p_household_id, role = 'member'
  WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_household(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(UUID) TO authenticated;
