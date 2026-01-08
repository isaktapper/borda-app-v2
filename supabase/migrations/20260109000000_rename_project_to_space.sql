-- Migration: Rename "project" to "space" throughout the database
-- This is a comprehensive rename that affects tables, columns, views, functions, and policies

-- ============================================================================
-- STEP 1: Drop dependent views first
-- ============================================================================
DROP VIEW IF EXISTS projects_with_assigned;

-- ============================================================================
-- STEP 2: Drop all RLS policies that reference project tables
-- ============================================================================

-- Policies on projects table
DROP POLICY IF EXISTS "Users can view projects in their organization" ON projects;
DROP POLICY IF EXISTS "Users can create projects in their organization" ON projects;
DROP POLICY IF EXISTS "Users can update projects in their organization" ON projects;
DROP POLICY IF EXISTS "project_update_policy" ON projects;

-- Policies on project_members table
DROP POLICY IF EXISTS "Users can view project members" ON project_members;
DROP POLICY IF EXISTS "Owners can manage project members" ON project_members;
DROP POLICY IF EXISTS "Users can add memberships during creation" ON project_members;
DROP POLICY IF EXISTS "project_members_select_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_insert_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_update_policy" ON project_members;
DROP POLICY IF EXISTS "project_members_delete_policy" ON project_members;
DROP POLICY IF EXISTS "Allow project member insertion" ON project_members;
DROP POLICY IF EXISTS "Owners can update members" ON project_members;
DROP POLICY IF EXISTS "Owners can delete members" ON project_members;

-- Policies on project_tags table
DROP POLICY IF EXISTS "Users can view project tags" ON project_tags;
DROP POLICY IF EXISTS "Users can manage project tags" ON project_tags;

-- ============================================================================
-- STEP 3: Rename tables
-- ============================================================================
ALTER TABLE projects RENAME TO spaces;
ALTER TABLE project_members RENAME TO space_members;
ALTER TABLE project_tags RENAME TO space_tags;

-- ============================================================================
-- STEP 3b: Drop policies on renamed tables that depend on old functions
-- ============================================================================
DROP POLICY IF EXISTS "Allow project member insertion" ON space_members;
DROP POLICY IF EXISTS "Owners can update members" ON space_members;
DROP POLICY IF EXISTS "Owners can delete members" ON space_members;

-- ============================================================================
-- STEP 4: Rename columns in all affected tables
-- ============================================================================

-- Rename project_id columns to space_id
ALTER TABLE space_members RENAME COLUMN project_id TO space_id;
ALTER TABLE space_tags RENAME COLUMN project_id TO space_id;
ALTER TABLE pages RENAME COLUMN project_id TO space_id;
ALTER TABLE tasks RENAME COLUMN project_id TO space_id;
ALTER TABLE files RENAME COLUMN project_id TO space_id;
ALTER TABLE activity_log RENAME COLUMN project_id TO space_id;
ALTER TABLE portal_access_tokens RENAME COLUMN project_id TO space_id;
ALTER TABLE portal_visits RENAME COLUMN project_id TO space_id;
ALTER TABLE slack_notifications RENAME COLUMN project_id TO space_id;

-- ============================================================================
-- STEP 5: Rename indexes
-- ============================================================================
ALTER INDEX IF EXISTS idx_projects_organization_id RENAME TO idx_spaces_organization_id;
ALTER INDEX IF EXISTS idx_project_members_user_id RENAME TO idx_space_members_user_id;
ALTER INDEX IF EXISTS idx_project_members_project_id RENAME TO idx_space_members_space_id;

-- ============================================================================
-- STEP 6: Rename functions
-- ============================================================================

-- First create the new function
CREATE OR REPLACE FUNCTION public.generate_space_id()
RETURNS text AS $$
DECLARE
  new_id text;
  exists_already boolean;
BEGIN
  LOOP
    new_id := lpad(floor(random() * 10000000)::text, 7, '0');
    SELECT EXISTS(SELECT 1 FROM spaces WHERE id = new_id) INTO exists_already;
    EXIT WHEN NOT exists_already;
  END LOOP;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql;

-- Update default for spaces.id to use new function BEFORE dropping old one
ALTER TABLE spaces ALTER COLUMN id SET DEFAULT public.generate_space_id();

-- Now we can safely drop the old function
DROP FUNCTION IF EXISTS generate_project_id();

-- Drop old functions with CASCADE (this will drop dependent policies too)
-- We'll recreate all necessary policies later
DROP FUNCTION IF EXISTS is_project_owner(text) CASCADE;
DROP FUNCTION IF EXISTS can_user_access_project(text) CASCADE;
DROP FUNCTION IF EXISTS project_has_owner(text) CASCADE;
DROP FUNCTION IF EXISTS validate_project_invite(uuid, text) CASCADE;

-- Create new functions
CREATE OR REPLACE FUNCTION public.is_space_owner(p_space_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND user_id = auth.uid()
    AND role = 'owner'
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- can_user_access_space (replaces can_user_access_project)
CREATE OR REPLACE FUNCTION public.can_user_access_space(p_space_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM spaces s
    WHERE s.id = p_space_id
    AND s.organization_id IN (SELECT get_user_org_ids())
    AND s.deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- space_has_owner (replaces project_has_owner)
CREATE OR REPLACE FUNCTION public.space_has_owner(p_space_id text)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM space_members
    WHERE space_id = p_space_id
    AND role = 'owner'
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql;

-- validate_space_invite (replaces validate_project_invite)
CREATE OR REPLACE FUNCTION public.validate_space_invite(p_token uuid, p_email text)
RETURNS TABLE(space_id text, role text, user_id uuid) AS $$
BEGIN
  RETURN QUERY
  SELECT sm.space_id, sm.role, sm.user_id
  FROM space_members sm
  WHERE sm.invite_token = p_token
  AND sm.invited_email = p_email
  AND sm.invite_expires_at > NOW()
  AND sm.deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- STEP 7: Recreate RLS policies with new names
-- ============================================================================

-- Policies for spaces table
CREATE POLICY "Users can view spaces in their organization"
  ON spaces FOR SELECT
  USING (
    organization_id IN (SELECT get_user_org_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create spaces in their organization"
  ON spaces FOR INSERT
  WITH CHECK (
    organization_id IN (SELECT get_user_org_ids())
  );

CREATE POLICY "Users can update spaces in their organization"
  ON spaces FOR UPDATE
  USING (
    organization_id IN (SELECT get_user_org_ids())
  );

-- Policies for space_members table
CREATE POLICY "Users can view space members"
  ON space_members FOR SELECT
  USING (
    space_id IN (
      SELECT id FROM spaces 
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Owners can manage space members"
  ON space_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM space_members sm
      WHERE sm.space_id = space_members.space_id
      AND sm.user_id = auth.uid()
      AND sm.role = 'owner'
    )
  );

CREATE POLICY "Users can add memberships during creation"
  ON space_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policies for space_tags table
CREATE POLICY "Users can view space tags"
  ON space_tags FOR SELECT
  USING (
    space_id IN (
      SELECT id FROM spaces 
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can manage space tags"
  ON space_tags FOR ALL
  USING (
    space_id IN (
      SELECT id FROM spaces 
      WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

-- Policies for tasks table (recreated after CASCADE drop)
CREATE POLICY "tasks_select_policy" ON tasks FOR SELECT
  USING (can_user_access_space(space_id));
  
CREATE POLICY "tasks_insert_policy" ON tasks FOR INSERT
  WITH CHECK (can_user_access_space(space_id));
  
CREATE POLICY "tasks_update_policy" ON tasks FOR UPDATE
  USING (can_user_access_space(space_id));
  
CREATE POLICY "tasks_delete_policy" ON tasks FOR DELETE
  USING (can_user_access_space(space_id));

-- Policies for files table (recreated after CASCADE drop)
CREATE POLICY "files_select_policy" ON files FOR SELECT
  USING (can_user_access_space(space_id));
  
CREATE POLICY "files_insert_policy" ON files FOR INSERT
  WITH CHECK (can_user_access_space(space_id));
  
CREATE POLICY "files_delete_policy" ON files FOR DELETE
  USING (can_user_access_space(space_id));

-- Policies for responses table (recreated after CASCADE drop)
CREATE POLICY "responses_select_policy" ON responses FOR SELECT
  USING (
    block_id IN (
      SELECT b.id FROM blocks b
      JOIN pages p ON b.page_id = p.id
      WHERE can_user_access_space(p.space_id)
    )
  );

CREATE POLICY "responses_delete_policy" ON responses FOR DELETE
  USING (
    block_id IN (
      SELECT b.id FROM blocks b
      JOIN pages p ON b.page_id = p.id
      WHERE can_user_access_space(p.space_id)
    )
  );

-- Policies for activity_log table (recreated after CASCADE drop)
CREATE POLICY "activity_select_policy" ON activity_log FOR SELECT
  USING (can_user_access_space(space_id));
  
CREATE POLICY "activity_insert_policy" ON activity_log FOR INSERT
  WITH CHECK (can_user_access_space(space_id));

-- Additional space_members policies (recreated after CASCADE drop)
CREATE POLICY "pm_select_authenticated" ON space_members FOR SELECT
  USING (can_user_access_space(space_id));

CREATE POLICY "pm_insert_manager" ON space_members FOR INSERT
  WITH CHECK (can_user_access_space(space_id));

CREATE POLICY "pm_update_manager" ON space_members FOR UPDATE
  USING (can_user_access_space(space_id));

CREATE POLICY "pm_delete_manager" ON space_members FOR DELETE
  USING (can_user_access_space(space_id));

-- ============================================================================
-- STEP 8: Recreate the view with new names
-- ============================================================================
CREATE VIEW spaces_with_assigned AS
SELECT 
  s.id,
  s.organization_id,
  s.name,
  s.client_name,
  s.client_logo_url,
  s.status,
  s.target_go_live_date,
  s.created_by,
  s.created_at,
  s.updated_at,
  s.deleted_at,
  s.assigned_to,
  s.logo_path,
  s.brand_color,
  s.template_id,
  s.engagement_score,
  s.engagement_level,
  s.engagement_calculated_at,
  s.engagement_factors,
  jsonb_build_object(
    'id', u.id,
    'email', u.email,
    'full_name', u.full_name,
    'avatar_url', u.avatar_url
  ) AS assigned_user
FROM spaces s
LEFT JOIN users u ON s.assigned_to = u.id;

-- ============================================================================
-- STEP 9: Update any remaining constraints or references
-- ============================================================================

-- Update the delete_page_rpc if it references project
DROP FUNCTION IF EXISTS delete_page_rpc(uuid);
CREATE FUNCTION public.delete_page_rpc(p_page_id uuid)
RETURNS void AS $$
BEGIN
  -- Soft delete blocks first
  UPDATE blocks SET deleted_at = NOW() WHERE page_id = p_page_id AND deleted_at IS NULL;
  -- Then soft delete the page
  UPDATE pages SET deleted_at = NOW() WHERE id = p_page_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update delete_block_rpc
DROP FUNCTION IF EXISTS delete_block_rpc(uuid);
CREATE FUNCTION public.delete_block_rpc(p_block_id uuid)
RETURNS void AS $$
BEGIN
  -- Soft delete tasks associated with this block
  UPDATE tasks SET deleted_at = NOW() WHERE block_id = p_block_id AND deleted_at IS NULL;
  -- Soft delete files associated with this block
  UPDATE files SET deleted_at = NOW() WHERE block_id = p_block_id AND deleted_at IS NULL;
  -- Soft delete the block itself
  UPDATE blocks SET deleted_at = NOW() WHERE id = p_block_id AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- DONE! 
-- Summary of changes:
-- - Renamed tables: projects→spaces, project_members→space_members, project_tags→space_tags
-- - Renamed columns: project_id→space_id in 8 tables
-- - Renamed functions: 5 functions updated
-- - Recreated view: projects_with_assigned→spaces_with_assigned
-- - Recreated RLS policies with new table references
-- ============================================================================

