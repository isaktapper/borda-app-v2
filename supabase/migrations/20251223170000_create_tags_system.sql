-- Taggar per organisation
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6b7280',
  created_at TIMESTAMPTZ DEFAULT now(),
  deleted_at TIMESTAMPTZ,
  UNIQUE(organization_id, name)
);

CREATE INDEX IF NOT EXISTS idx_tags_org ON tags(organization_id);
CREATE INDEX IF NOT EXISTS idx_tags_deleted ON tags(deleted_at) WHERE deleted_at IS NULL;

-- Koppling projekt <-> taggar (many-to-many)
CREATE TABLE IF NOT EXISTS project_tags (
  project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  PRIMARY KEY (project_id, tag_id)
);

CREATE INDEX IF NOT EXISTS idx_project_tags_project ON project_tags(project_id);
CREATE INDEX IF NOT EXISTS idx_project_tags_tag ON project_tags(tag_id);

-- Enable RLS
ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tags
CREATE POLICY "Users can view org tags"
  ON tags FOR SELECT
  USING (
    organization_id IN (SELECT get_user_org_ids())
    AND deleted_at IS NULL
  );

CREATE POLICY "Users can create org tags"
  ON tags FOR INSERT
  WITH CHECK (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can update org tags"
  ON tags FOR UPDATE
  USING (organization_id IN (SELECT get_user_org_ids()));

CREATE POLICY "Users can delete org tags"
  ON tags FOR DELETE
  USING (organization_id IN (SELECT get_user_org_ids()));

-- RLS Policies for project_tags
CREATE POLICY "Users can view project tags"
  ON project_tags FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can create project tags"
  ON project_tags FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );

CREATE POLICY "Users can delete project tags"
  ON project_tags FOR DELETE
  USING (
    project_id IN (
      SELECT id FROM projects WHERE organization_id IN (SELECT get_user_org_ids())
    )
  );
