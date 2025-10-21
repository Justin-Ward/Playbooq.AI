-- Create internal_pages table for storing internal page data
CREATE TABLE IF NOT EXISTS internal_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  page_name VARCHAR(255) NOT NULL,
  page_title VARCHAR(500) NOT NULL,
  content TEXT DEFAULT '',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID NOT NULL,
  
  -- Ensure unique page names within a playbook
  UNIQUE(playbook_id, page_name)
);

-- Create internal_page_permissions table for collaborator access control
CREATE TABLE IF NOT EXISTS internal_page_permissions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  internal_page_id UUID NOT NULL REFERENCES internal_pages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  permission_level VARCHAR(20) NOT NULL CHECK (permission_level IN ('owner', 'edit', 'view')),
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Ensure unique user permissions per page
  UNIQUE(internal_page_id, user_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_internal_pages_playbook_id ON internal_pages(playbook_id);
CREATE INDEX IF NOT EXISTS idx_internal_pages_created_by ON internal_pages(created_by);
CREATE INDEX IF NOT EXISTS idx_internal_page_permissions_page_id ON internal_page_permissions(internal_page_id);
CREATE INDEX IF NOT EXISTS idx_internal_page_permissions_user_id ON internal_page_permissions(user_id);

-- Create updated_at trigger for internal_pages
CREATE OR REPLACE FUNCTION update_internal_pages_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_internal_pages_updated_at
  BEFORE UPDATE ON internal_pages
  FOR EACH ROW
  EXECUTE FUNCTION update_internal_pages_updated_at();

-- Row Level Security (RLS) Policies

-- Enable RLS on internal_pages
ALTER TABLE internal_pages ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view internal pages if they have access to the playbook
CREATE POLICY "Users can view internal pages if they have playbook access" ON internal_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playbooks p
      LEFT JOIN collaborators c ON c.playbook_id = p.id
      WHERE p.id = internal_pages.playbook_id
      AND (
        p.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR c.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
      )
    )
  );

-- Policy: Users can create internal pages if they can edit the playbook
CREATE POLICY "Users can create internal pages if they can edit playbook" ON internal_pages
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM playbooks p
      LEFT JOIN collaborators c ON c.playbook_id = p.id
      WHERE p.id = internal_pages.playbook_id
      AND (
        p.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id') 
            AND c.permission_level IN ('owner', 'edit'))
      )
    )
    AND created_by::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
  );

-- Policy: Users can update internal pages if they have edit/owner permission
CREATE POLICY "Users can update internal pages with edit/owner permission" ON internal_pages
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM playbooks p
      LEFT JOIN collaborators c ON c.playbook_id = p.id
      WHERE p.id = internal_pages.playbook_id
      AND (
        p.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id') 
            AND c.permission_level IN ('owner', 'edit'))
      )
    )
  );

-- Policy: Users can delete internal pages if they have owner permission
CREATE POLICY "Users can delete internal pages with owner permission" ON internal_pages
  FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM playbooks p
      LEFT JOIN collaborators c ON c.playbook_id = p.id
      WHERE p.id = internal_pages.playbook_id
      AND (
        p.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id') 
            AND c.permission_level = 'owner')
      )
    )
  );

-- Enable RLS on internal_page_permissions
ALTER TABLE internal_page_permissions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view permissions for pages they have access to
CREATE POLICY "Users can view permissions for accessible pages" ON internal_page_permissions
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM internal_pages ip
      JOIN playbooks p ON p.id = ip.playbook_id
      LEFT JOIN collaborators c ON c.playbook_id = p.id
      WHERE ip.id = internal_page_permissions.internal_page_id
      AND (
        p.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR c.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
      )
    )
  );

-- Policy: Users can manage permissions if they have owner permission on the playbook
CREATE POLICY "Users can manage permissions with owner access" ON internal_page_permissions
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM internal_pages ip
      JOIN playbooks p ON p.id = ip.playbook_id
      LEFT JOIN collaborators c ON c.playbook_id = p.id
      WHERE ip.id = internal_page_permissions.internal_page_id
      AND (
        p.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id') 
            AND c.permission_level = 'owner')
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM internal_pages ip
      JOIN playbooks p ON p.id = ip.playbook_id
      LEFT JOIN collaborators c ON c.playbook_id = p.id
      WHERE ip.id = internal_page_permissions.internal_page_id
      AND (
        p.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id::text = (current_setting('request.jwt.claims', true)::json->>'user_id') 
            AND c.permission_level = 'owner')
      )
    )
    AND granted_by::text = (current_setting('request.jwt.claims', true)::json->>'user_id')
  );

-- Create a view for easy querying of internal pages with permissions
CREATE OR REPLACE VIEW internal_pages_with_permissions AS
SELECT 
  ip.id,
  ip.playbook_id,
  ip.page_name,
  ip.page_title,
  ip.content,
  ip.created_at,
  ip.updated_at,
  ip.created_by,
  up.user_id,
  up.permission_level,
  up.granted_at
FROM internal_pages ip
LEFT JOIN internal_page_permissions up ON up.internal_page_id = ip.id;

-- Grant access to the view
GRANT SELECT ON internal_pages_with_permissions TO authenticated;
