-- Add who_can_remove setting to lists
ALTER TABLE lists ADD COLUMN IF NOT EXISTS who_can_remove text NOT NULL DEFAULT 'owner'
    CHECK (who_can_remove IN ('owner', 'any_member'));

-- Update delete policy: allow any active member to remove when who_can_remove='any_member'
DROP POLICY IF EXISTS "list_members_delete_owner" ON list_members;

CREATE POLICY "list_members_delete" ON list_members
    FOR DELETE USING (
        EXISTS (
            SELECT 1 FROM list_members lm
            JOIN lists l ON l.id = lm.list_id
            WHERE lm.list_id = list_members.list_id
              AND lm.user_id = auth.uid()
              AND lm.status = 'active'
              AND (
                  lm.role = 'owner'
                  OR l.who_can_remove = 'any_member'
              )
        )
    );
