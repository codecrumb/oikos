-- ============================================================
-- Oikos — Initial Schema
-- Run this in your Supabase SQL editor (Database → SQL Editor).
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ------------------------------------------------------------
-- Tables
-- ------------------------------------------------------------

CREATE TABLE households (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Members are tied 1:1 to auth.users.
-- household_id is NULL until the user creates/joins a household.
CREATE TABLE members (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  household_id  UUID REFERENCES households(id) ON DELETE CASCADE,
  display_name  TEXT NOT NULL,
  avatar_color  TEXT NOT NULL DEFAULT '#6366f1',
  role          TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE chores (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  assigned_to  UUID REFERENCES members(id) ON DELETE SET NULL,
  title        TEXT NOT NULL,
  due_date     DATE,
  recurrence   TEXT,           -- 'daily' | 'weekly' | 'monthly' | NULL
  completed_at TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shopping_items (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  added_by     UUID REFERENCES members(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  quantity     TEXT,
  checked      BOOLEAN NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE events (
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

CREATE TABLE push_subscriptions (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  member_id  UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  endpoint   TEXT NOT NULL,
  p256dh     TEXT NOT NULL,
  auth       TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ------------------------------------------------------------
-- Helper: returns the current user's household_id
-- SECURITY DEFINER so RLS policies can call it without recursion.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION current_household_id()
RETURNS UUID
LANGUAGE SQL
SECURITY DEFINER
STABLE
AS $$
  SELECT household_id FROM members WHERE id = auth.uid()
$$;

-- ------------------------------------------------------------
-- Row-Level Security
-- ------------------------------------------------------------

ALTER TABLE households       ENABLE ROW LEVEL SECURITY;
ALTER TABLE members          ENABLE ROW LEVEL SECURITY;
ALTER TABLE chores           ENABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- households ─────────────────────────────────────────────────

CREATE POLICY "members can read their household"
  ON households FOR SELECT
  USING (id = current_household_id());

-- Any authenticated user may create a household (first-time setup).
CREATE POLICY "authenticated users can create household"
  ON households FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "admins can update their household"
  ON households FOR UPDATE
  USING (id = current_household_id())
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM members
      WHERE id = auth.uid()
        AND household_id = current_household_id()
        AND role = 'admin'
    )
  );

-- members ─────────────────────────────────────────────────────

CREATE POLICY "users can read members in their household"
  ON members FOR SELECT
  USING (household_id = current_household_id() OR id = auth.uid());

-- Authenticated users may create their own member row.
CREATE POLICY "users can insert themselves"
  ON members FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "users can update their own profile"
  ON members FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- chores ──────────────────────────────────────────────────────

CREATE POLICY "household members can read chores"
  ON chores FOR SELECT
  USING (household_id = current_household_id());

CREATE POLICY "household members can create chores"
  ON chores FOR INSERT
  WITH CHECK (household_id = current_household_id());

CREATE POLICY "household members can update chores"
  ON chores FOR UPDATE
  USING (household_id = current_household_id())
  WITH CHECK (household_id = current_household_id());

CREATE POLICY "household members can delete chores"
  ON chores FOR DELETE
  USING (household_id = current_household_id());

-- shopping_items ──────────────────────────────────────────────

CREATE POLICY "household members can read shopping"
  ON shopping_items FOR SELECT
  USING (household_id = current_household_id());

CREATE POLICY "household members can create shopping items"
  ON shopping_items FOR INSERT
  WITH CHECK (household_id = current_household_id());

CREATE POLICY "household members can update shopping items"
  ON shopping_items FOR UPDATE
  USING (household_id = current_household_id())
  WITH CHECK (household_id = current_household_id());

CREATE POLICY "household members can delete shopping items"
  ON shopping_items FOR DELETE
  USING (household_id = current_household_id());

-- events ──────────────────────────────────────────────────────

CREATE POLICY "household members can read events"
  ON events FOR SELECT
  USING (household_id = current_household_id());

CREATE POLICY "household members can create events"
  ON events FOR INSERT
  WITH CHECK (household_id = current_household_id());

CREATE POLICY "household members can update events"
  ON events FOR UPDATE
  USING (household_id = current_household_id())
  WITH CHECK (household_id = current_household_id());

CREATE POLICY "household members can delete events"
  ON events FOR DELETE
  USING (household_id = current_household_id());

-- push_subscriptions ──────────────────────────────────────────

CREATE POLICY "users can manage their own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (member_id = auth.uid())
  WITH CHECK (member_id = auth.uid());

-- ------------------------------------------------------------
-- Realtime
-- Enable live sync for the tables the UI subscribes to.
-- ------------------------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE chores;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_items;
ALTER PUBLICATION supabase_realtime ADD TABLE events;
ALTER PUBLICATION supabase_realtime ADD TABLE members;
