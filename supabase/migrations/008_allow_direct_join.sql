-- Update the insert policy to allow direct join (status='active')
-- when the list has require_approval=false
DROP POLICY IF EXISTS "list_members_insert" ON list_members;

CREATE POLICY "list_members_insert" ON list_members
    FOR INSERT WITH CHECK (
        user_id = auth.uid()
        AND role = 'member'
        AND (
            status = 'pending'
            OR (
                status = 'active'
                AND EXISTS (
                    SELECT 1 FROM lists
                    WHERE lists.id = list_members.list_id
                    AND lists.require_approval = false
                )
            )
        )
    );

-- Also allow any active member to approve when who_can_approve='any_member'
DROP POLICY IF EXISTS "list_members_update_owner" ON list_members;

CREATE POLICY "list_members_update" ON list_members
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM list_members lm
            JOIN lists l ON l.id = lm.list_id
            WHERE lm.list_id = list_members.list_id
              AND lm.user_id = auth.uid()
              AND lm.status = 'active'
              AND (
                  lm.role = 'owner'
                  OR l.who_can_approve = 'any_member'
              )
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM list_members lm
            JOIN lists l ON l.id = lm.list_id
            WHERE lm.list_id = list_members.list_id
              AND lm.user_id = auth.uid()
              AND lm.status = 'active'
              AND (
                  lm.role = 'owner'
                  OR l.who_can_approve = 'any_member'
              )
        )
    );
