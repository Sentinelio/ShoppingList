-- ============================================================
-- 001_initial.sql  –  Multilingual Shopping List App
-- ============================================================

-- 1. USERS
CREATE TABLE users (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    lang       text DEFAULT 'en',
    country    text DEFAULT 'PL',
    avatar_color text DEFAULT '#f0883e',
    created_at timestamptz DEFAULT now()
);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Users can read their own record
CREATE POLICY "users_select_own" ON users
    FOR SELECT USING (auth.uid() = id);

-- Users can update their own record
CREATE POLICY "users_update_own" ON users
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- 2. LISTS
CREATE TABLE lists (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name       text NOT NULL,
    code       text UNIQUE NOT NULL,
    created_by uuid REFERENCES users (id),
    created_at timestamptz DEFAULT now()
);

ALTER TABLE lists ENABLE ROW LEVEL SECURITY;

-- Members can read their lists
CREATE POLICY "lists_select_members" ON lists
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM list_members
            WHERE list_members.list_id = lists.id
              AND list_members.user_id = auth.uid()
              AND list_members.status = 'active'
        )
    );

-- 3. LIST_MEMBERS
CREATE TABLE list_members (
    list_id   uuid REFERENCES lists (id) ON DELETE CASCADE,
    user_id   uuid REFERENCES users (id) ON DELETE CASCADE,
    role      text NOT NULL CHECK (role IN ('owner', 'member')),
    status    text NOT NULL DEFAULT 'pending' CHECK (status IN ('active', 'pending', 'rejected')),
    joined_at timestamptz DEFAULT now(),
    PRIMARY KEY (list_id, user_id)
);

ALTER TABLE list_members ENABLE ROW LEVEL SECURITY;

-- Active members can read membership rows for their lists
CREATE POLICY "list_members_select" ON list_members
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM list_members lm
            WHERE lm.list_id = list_members.list_id
              AND lm.user_id = auth.uid()
              AND lm.status = 'active'
        )
    );

-- Members can insert themselves (e.g. join via invite code) as pending
CREATE POLICY "list_members_insert" ON list_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND status = 'pending'
    );

-- Only the list owner can approve/reject pending members (update status)
CREATE POLICY "list_members_update_owner" ON list_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM list_members lm
            WHERE lm.list_id = list_members.list_id
              AND lm.user_id = auth.uid()
              AND lm.role = 'owner'
              AND lm.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM list_members lm
            WHERE lm.list_id = list_members.list_id
              AND lm.user_id = auth.uid()
              AND lm.role = 'owner'
              AND lm.status = 'active'
        )
    );

-- Only the list owner can remove members
CREATE POLICY "list_members_delete_owner" ON list_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM list_members lm
            WHERE lm.list_id = list_members.list_id
              AND lm.user_id = auth.uid()
              AND lm.role = 'owner'
              AND lm.status = 'active'
        )
    );

-- 4. ITEMS
CREATE TABLE items (
    id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id       uuid NOT NULL REFERENCES lists (id) ON DELETE CASCADE,
    original      text NOT NULL,
    translations  jsonb DEFAULT '{}',
    category      text DEFAULT 'other',
    qty           text,
    unit          text,
    note          text,
    checked       boolean DEFAULT false,
    added_by      uuid REFERENCES users (id),
    added_by_name text,
    created_at    timestamptz DEFAULT now()
);

CREATE INDEX idx_items_list_id ON items (list_id);

ALTER TABLE items ENABLE ROW LEVEL SECURITY;

-- Only active members of the list can read items
CREATE POLICY "items_select" ON items
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM list_members
            WHERE list_members.list_id = items.list_id
              AND list_members.user_id = auth.uid()
              AND list_members.status = 'active'
        )
    );

-- Only active members of the list can insert items
CREATE POLICY "items_insert" ON items
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM list_members
            WHERE list_members.list_id = items.list_id
              AND list_members.user_id = auth.uid()
              AND list_members.status = 'active'
        )
    );

-- Only active members of the list can update items
CREATE POLICY "items_update" ON items
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM list_members
            WHERE list_members.list_id = items.list_id
              AND list_members.user_id = auth.uid()
              AND list_members.status = 'active'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM list_members
            WHERE list_members.list_id = items.list_id
              AND list_members.user_id = auth.uid()
              AND list_members.status = 'active'
        )
    );

-- Only active members of the list can delete items
CREATE POLICY "items_delete" ON items
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM list_members
            WHERE list_members.list_id = items.list_id
              AND list_members.user_id = auth.uid()
              AND list_members.status = 'active'
        )
    );

-- 5. DICTIONARY
CREATE TABLE dictionary (
    key          text PRIMARY KEY,
    translations jsonb NOT NULL,
    category     text DEFAULT 'other',
    created_at   timestamptz DEFAULT now()
);

ALTER TABLE dictionary ENABLE ROW LEVEL SECURITY;

-- Public read access to the dictionary
CREATE POLICY "dictionary_select_public" ON dictionary
    FOR SELECT USING (true);

-- Write access only via service role (no authenticated-user policy for INSERT/UPDATE/DELETE)
-- The service_role key bypasses RLS, so no explicit policy is needed for writes.
