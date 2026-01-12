-- Migrate customer role to stakeholder
-- Stakeholders can be assigned to tasks AND have portal access (in restricted mode)

-- 1. Add name column for stakeholders (display name for task assignment)
ALTER TABLE space_members ADD COLUMN IF NOT EXISTS name TEXT;

-- 2. Drop existing role constraints FIRST (before updating data)
-- Could be named project_members_role_check or space_members_role_check
DO $$
BEGIN
    -- Try dropping the old project_members constraint name first
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'project_members_role_check' 
        AND table_name = 'space_members'
    ) THEN
        ALTER TABLE space_members DROP CONSTRAINT project_members_role_check;
    END IF;
    
    -- Also try the space_members constraint name
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'space_members_role_check' 
        AND table_name = 'space_members'
    ) THEN
        ALTER TABLE space_members DROP CONSTRAINT space_members_role_check;
    END IF;
END $$;

-- 3. Now migrate existing customers to stakeholders (constraint is gone)
UPDATE space_members SET role = 'stakeholder' WHERE role = 'customer';

-- 4. Add new constraint with stakeholder role
ALTER TABLE space_members
  ADD CONSTRAINT space_members_role_check 
  CHECK (role IN ('owner', 'admin', 'member', 'stakeholder'));

-- 5. Add index for finding stakeholders by space
CREATE INDEX IF NOT EXISTS idx_space_members_stakeholders 
  ON space_members(space_id) 
  WHERE role = 'stakeholder';
