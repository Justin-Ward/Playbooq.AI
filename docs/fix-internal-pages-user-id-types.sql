-- Fix internal pages user ID columns to accept Clerk user IDs (text instead of UUID)
-- This script drops RLS policies, alters column types, then recreates the policies

-- Step 1: Drop the view that depends on these columns
DROP VIEW IF EXISTS internal_pages_with_permissions;

-- Step 2: Drop all RLS policies on internal_pages
DROP POLICY IF EXISTS "Users can view internal pages if they have playbook access" ON internal_pages;
DROP POLICY IF EXISTS "Users can create internal pages if they can edit playbook" ON internal_pages;
DROP POLICY IF EXISTS "Users can update internal pages with edit/owner permission" ON internal_pages;
DROP POLICY IF EXISTS "Users can delete internal pages with owner permission" ON internal_pages;

-- Step 3: Drop all RLS policies on internal_page_permissions
DROP POLICY IF EXISTS "Users can view permissions for accessible pages" ON internal_page_permissions;
DROP POLICY IF EXISTS "Users can manage permissions with owner access" ON internal_page_permissions;

-- Step 4: Alter column types to TEXT
ALTER TABLE internal_pages 
  ALTER COLUMN created_by TYPE TEXT;

ALTER TABLE internal_page_permissions 
  ALTER COLUMN user_id TYPE TEXT,
  ALTER COLUMN granted_by TYPE TEXT;

-- Step 5: Drop and recreate indexes
DROP INDEX IF EXISTS idx_internal_pages_created_by;
CREATE INDEX idx_internal_pages_created_by ON internal_pages(created_by);

DROP INDEX IF EXISTS idx_internal_page_permissions_user_id;
CREATE INDEX idx_internal_page_permissions_user_id ON internal_page_permissions(user_id);

-- Step 6: Recreate RLS policies for internal_pages (without ::text casts since they're already text)

-- Policy: Users can view internal pages if they have access to the playbook
CREATE POLICY "Users can view internal pages if they have playbook access" ON internal_pages
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM playbooks p
      LEFT JOIN collaborators c ON c.playbook_id = p.id
      WHERE p.id = internal_pages.playbook_id
      AND (
        p.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR c.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
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
        p.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id') 
            AND c.permission_level IN ('owner', 'edit'))
      )
    )
    AND created_by = (current_setting('request.jwt.claims', true)::json->>'user_id')
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
        p.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id') 
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
        p.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id') 
            AND c.permission_level = 'owner')
      )
    )
  );

-- Step 7: Recreate RLS policies for internal_page_permissions (without ::text casts)

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
        p.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR c.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
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
        p.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id') 
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
        p.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id')
        OR (c.user_id = (current_setting('request.jwt.claims', true)::json->>'user_id') 
            AND c.permission_level = 'owner')
      )
    )
    AND granted_by = (current_setting('request.jwt.claims', true)::json->>'user_id')
  );

-- Step 8: Recreate the view for easy querying of internal pages with permissions
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

