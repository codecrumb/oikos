-- =============================================================
-- Oikos — Complete Database Setup
-- Run this once in Supabase: Database → SQL Editor → New query
-- Safe to re-run (all statements are idempotent).
-- =============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -------------------------------------------------------------
-- Tables
-- -------------------------------------------------------------

CREATE TABLE IF NOT EXISTS households (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS members (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id  UUID REFERENCES households(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_color  TEXT NOT NULL DEFAULT '#6366f1',
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  assigned_to  UUID REFERENCES members(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  due_date     DATE,
  recurrence   TEXT,
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS shopping_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  added_by     UUID REFERENCES members(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  quantity     TEXT,
  checked      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS events (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  created_by   UUID REFERENCES members(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  starts_at    TIMESTAMPTZ NOT NULL,
  ends_at      TIMESTAMPTZ,
  all_day      BOOLEAN NOT NULL DEFAULT FALSE,
  color        TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- -------------------------------------------------------------
-- Helper: returns the current user's household_id
-- -------------------------------------------------------------

CREATE OR REPLACE FUNCTION current_household_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT household_id FROM members WHERE id = auth.uid()
$$;

-- -------------------------------------------------------------
-- Trigger: auto-create member row on sign-up
-- Reads display_name, avatar_color, and household_id from
-- user metadata (household_id is set when invited by an admin).
-- -------------------------------------------------------------

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

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- -------------------------------------------------------------
-- RPC functions (SECURITY DEFINER — bypass RLS safely)
-- -------------------------------------------------------------

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
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  INSERT INTO public.households (name) VALUES (p_name) RETURNING id INTO v_household_id;
  UPDATE public.members SET household_id = v_household_id, role = 'admin' WHERE id = v_user_id;

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
  IF v_user_id IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  IF NOT EXISTS (SELECT 1 FROM public.households WHERE id = p_household_id) THEN
    RAISE EXCEPTION 'Household not found';
  END IF;
  UPDATE public.members SET household_id = p_household_id, role = 'member' WHERE id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_household(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(UUID) TO authenticated;

-- -------------------------------------------------------------
-- Row-Level Security
-- -------------------------------------------------------------

ALTER TABLE households       ENABLE ROW LEVEL SECURITY;
ALTER TABLE members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (safe to re-run)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'public' LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', r.policyname, r.tablename);
  END LOOP;
END $$;

-- households
CREATE POLICY "members can read their household"
  ON households FOR SELECT USING (id = current_household_id());
CREATE POLICY "authenticated users can create household"
  ON households FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "admins can update their household"
  ON households FOR UPDATE
  USING (id = current_household_id())
  WITH CHECK (EXISTS (
    SELECT 1 FROM members WHERE id = auth.uid() AND household_id = current_household_id() AND role = 'admin'
  ));

-- members
CREATE POLICY "users can read members in their household"
  ON members FOR SELECT USING (household_id = current_household_id() OR id = auth.uid());
CREATE POLICY "users can insert themselves"
  ON members FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "users can update their own profile"
  ON members FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- chores
CREATE POLICY "household members can read chores"
  ON chores FOR SELECT USING (household_id = current_household_id());
CREATE POLICY "household members can create chores"
  ON chores FOR INSERT WITH CHECK (household_id = current_household_id());
CREATE POLICY "household members can update chores"
  ON chores FOR UPDATE USING (household_id = current_household_id()) WITH CHECK (household_id = current_household_id());
CREATE POLICY "household members can delete chores"
  ON chores FOR DELETE USING (household_id = current_household_id());

-- shopping_items
CREATE POLICY "household members can read shopping"
  ON shopping_items FOR SELECT USING (household_id = current_household_id());
CREATE POLICY "household members can create shopping items"
  ON shopping_items FOR INSERT WITH CHECK (household_id = current_household_id());
CREATE POLICY "household members can update shopping items"
  ON shopping_items FOR UPDATE USING (household_id = current_household_id()) WITH CHECK (household_id = current_household_id());
CREATE POLICY "household members can delete shopping items"
  ON shopping_items FOR DELETE USING (household_id = current_household_id());

-- events
CREATE POLICY "household members can read events"
  ON events FOR SELECT USING (household_id = current_household_id());
CREATE POLICY "household members can create events"
  ON events FOR INSERT WITH CHECK (household_id = current_household_id());
CREATE POLICY "household members can update events"
  ON events FOR UPDATE USING (household_id = current_household_id()) WITH CHECK (household_id = current_household_id());
CREATE POLICY "household members can delete events"
  ON events FOR DELETE USING (household_id = current_household_id());

-- push_subscriptions
CREATE POLICY "users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (member_id = auth.uid()) WITH CHECK (member_id = auth.uid());

-- -------------------------------------------------------------
-- Realtime
-- -------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE chores;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE members;

-- -------------------------------------------------------------
-- Grants
-- -------------------------------------------------------------

GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
