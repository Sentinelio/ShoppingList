-- Add approval settings to lists
ALTER TABLE lists ADD COLUMN IF NOT EXISTS require_approval boolean NOT NULL DEFAULT true;
ALTER TABLE lists ADD COLUMN IF NOT EXISTS who_can_approve text NOT NULL DEFAULT 'owner'
    CHECK (who_can_approve IN ('owner', 'any_member'));
