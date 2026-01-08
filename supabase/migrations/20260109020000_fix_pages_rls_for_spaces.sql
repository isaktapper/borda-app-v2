-- Fix pages RLS policies to use spaces instead of projects
-- The column was renamed from project_id to space_id

-- 1. Drop existing policies
DROP POLICY IF EXISTS "pages_select_direct" ON pages;
DROP POLICY IF EXISTS "pages_insert_direct" ON pages;
DROP POLICY IF EXISTS "pages_update_direct" ON pages;
DROP POLICY IF EXISTS "pages_delete_direct" ON pages;

-- Also drop any old policies that might exist
DROP POLICY IF EXISTS "pages_select_policy" ON pages;
DROP POLICY IF EXISTS "pages_insert_policy" ON pages;
DROP POLICY IF EXISTS "pages_update_policy" ON pages;
DROP POLICY IF EXISTS "pages_delete_policy" ON pages;
DROP POLICY IF EXISTS "Users can view non-deleted pages" ON pages;
DROP POLICY IF EXISTS "Organization members can manage pages" ON pages;
DROP POLICY IF EXISTS "Organization members can insert pages" ON pages;
DROP POLICY IF EXISTS "Organization members can update pages" ON pages;
DROP POLICY IF EXISTS "Organization members can delete pages" ON pages;
DROP POLICY IF EXISTS "Users can view pages of their organization's projects" ON pages;
DROP POLICY IF EXISTS "Project owners can manage pages" ON pages;

-- 2. SELECT: In organization and NOT deleted
CREATE POLICY "pages_select_policy"
  ON pages FOR SELECT
  USING (
    space_id IN (
      SELECT s.id FROM spaces s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- 3. INSERT: In organization
CREATE POLICY "pages_insert_policy"
  ON pages FOR INSERT
  WITH CHECK (
    space_id IN (
      SELECT s.id FROM spaces s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- 4. UPDATE: In organization (no deleted_at check so soft delete works)
CREATE POLICY "pages_update_policy"
  ON pages FOR UPDATE
  USING (
    space_id IN (
      SELECT s.id FROM spaces s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  )
  WITH CHECK (
    space_id IN (
      SELECT s.id FROM spaces s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- 5. DELETE: In organization
CREATE POLICY "pages_delete_policy"
  ON pages FOR DELETE
  USING (
    space_id IN (
      SELECT s.id FROM spaces s
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- ============================================================================
-- BLOCKS: Fix policies to use spaces instead of projects
-- ============================================================================

-- Drop existing blocks policies
DROP POLICY IF EXISTS "blocks_select_policy" ON blocks;
DROP POLICY IF EXISTS "blocks_insert_policy" ON blocks;
DROP POLICY IF EXISTS "blocks_update_policy" ON blocks;
DROP POLICY IF EXISTS "blocks_delete_policy" ON blocks;

-- SELECT: Can view blocks for pages in their organization's spaces
CREATE POLICY "blocks_select_policy"
  ON blocks FOR SELECT
  USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN spaces s ON p.space_id = s.id
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
      AND p.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- INSERT: Can insert if in organization
CREATE POLICY "blocks_insert_policy"
  ON blocks FOR INSERT
  WITH CHECK (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN spaces s ON p.space_id = s.id
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- UPDATE: Can update if in organization
CREATE POLICY "blocks_update_policy"
  ON blocks FOR UPDATE
  USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN spaces s ON p.space_id = s.id
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

-- DELETE: Can delete if in organization
CREATE POLICY "blocks_delete_policy"
  ON blocks FOR DELETE
  USING (
    page_id IN (
      SELECT p.id FROM pages p
      JOIN spaces s ON p.space_id = s.id
      JOIN organization_members om ON s.organization_id = om.organization_id
      WHERE om.user_id = auth.uid()
    )
  );

