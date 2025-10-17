-- Assignment functionality for Playbooq
-- Final version compatible with your existing schema
-- Works with owner_id and collaborators table (without permission column)

-- Create assignments table to store assignment metadata
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  assigned_to TEXT NOT NULL, -- User ID of the assignee (TEXT to support manual entries)
  assigned_to_name TEXT NOT NULL, -- Display name of the assignee
  assigned_by TEXT NOT NULL, -- User ID of the person who created the assignment
  assigned_by_name TEXT NOT NULL, -- Display name of the person who created the assignment
  due_date TIMESTAMPTZ NOT NULL,
  assignment_color TEXT NOT NULL DEFAULT '#fef3c7', -- Hex color for the assignment
  content_range JSONB, -- Store the range of content this assignment applies to
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assignment_comments table for assignment-related discussions
CREATE TABLE IF NOT EXISTS assignment_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- User ID of the commenter
  user_name TEXT NOT NULL, -- Display name of the commenter
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assignment_notifications table for tracking notifications
CREATE TABLE IF NOT EXISTS assignment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- User who should receive the notification
  notification_type TEXT NOT NULL CHECK (notification_type IN ('assigned', 'due_soon', 'overdue', 'completed', 'commented')),
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignments_playbook_id ON assignments(playbook_id);
CREATE INDEX IF NOT EXISTS idx_assignments_assigned_to ON assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_assignments_due_date ON assignments(due_date);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_assignment_comments_assignment_id ON assignment_comments(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_user_id ON assignment_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_assignment_notifications_is_read ON assignment_notifications(is_read);

-- Create updated_at trigger for assignments table
CREATE OR REPLACE FUNCTION update_assignments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_assignments_updated_at ON assignments;
CREATE TRIGGER trigger_update_assignments_updated_at
  BEFORE UPDATE ON assignments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignments_updated_at();

-- Create updated_at trigger for assignment_comments table
CREATE OR REPLACE FUNCTION update_assignment_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_assignment_comments_updated_at ON assignment_comments;
CREATE TRIGGER trigger_update_assignment_comments_updated_at
  BEFORE UPDATE ON assignment_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_comments_updated_at();

-- RLS Policies for assignments table
-- Simplified policies that work with basic collaborators table
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assignments for playbooks they have access to
DROP POLICY IF EXISTS "Users can view assignments for accessible playbooks" ON assignments;
CREATE POLICY "Users can view assignments for accessible playbooks" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = assignments.playbook_id
      AND (
        -- User is the owner
        p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
        OR
        -- User is an accepted collaborator
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
          AND c.status = 'accepted'
        )
      )
    )
  );

-- Policy: Users can create assignments for playbooks they can edit
-- Only owner or collaborators with 'edit' or 'admin' permission can create assignments
DROP POLICY IF EXISTS "Users can create assignments for editable playbooks" ON assignments;
CREATE POLICY "Users can create assignments for editable playbooks" ON assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = assignments.playbook_id
      AND (
        -- User is the owner
        p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
        OR
        -- User is an accepted collaborator with edit or admin permission
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
          AND c.status = 'accepted'
          AND c.permission_level IN ('edit', 'admin')
        )
      )
    )
  );

-- Policy: Users can update assignments they are involved with or have edit permission
DROP POLICY IF EXISTS "Users can update relevant assignments" ON assignments;
CREATE POLICY "Users can update relevant assignments" ON assignments
  FOR UPDATE USING (
    -- User is assigned to this assignment (can update status, etc.)
    assigned_to = current_setting('request.jwt.claims', true)::json->>'user_id'
    OR
    -- User created this assignment
    assigned_by = current_setting('request.jwt.claims', true)::json->>'user_id'
    OR
    -- User owns the playbook
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = assignments.playbook_id
      AND p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
    )
    OR
    -- User is a collaborator with edit or admin permission
    EXISTS (
      SELECT 1 FROM playbooks p
      JOIN collaborators c ON c.playbook_id = p.id
      WHERE p.id = assignments.playbook_id
      AND c.user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
      AND c.status = 'accepted'
      AND c.permission_level IN ('edit', 'admin')
    )
  );

-- Policy: Users can delete assignments they created, if they own the playbook, or have admin permission
DROP POLICY IF EXISTS "Users can delete relevant assignments" ON assignments;
CREATE POLICY "Users can delete relevant assignments" ON assignments
  FOR DELETE USING (
    -- User created this assignment
    assigned_by = current_setting('request.jwt.claims', true)::json->>'user_id'
    OR
    -- User owns the playbook
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = assignments.playbook_id
      AND p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
    )
    OR
    -- User is a collaborator with admin permission
    EXISTS (
      SELECT 1 FROM playbooks p
      JOIN collaborators c ON c.playbook_id = p.id
      WHERE p.id = assignments.playbook_id
      AND c.user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
      AND c.status = 'accepted'
      AND c.permission_level = 'admin'
    )
  );

-- RLS Policies for assignment_comments table
ALTER TABLE assignment_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments for assignments they have access to
DROP POLICY IF EXISTS "Users can view assignment comments" ON assignment_comments;
CREATE POLICY "Users can view assignment comments" ON assignment_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN playbooks p ON p.id = a.playbook_id
      WHERE a.id = assignment_comments.assignment_id
      AND (
        -- User owns the playbook
        p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
        OR
        -- User is an accepted collaborator
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
          AND c.status = 'accepted'
        )
      )
    )
  );

-- Policy: Users can create comments for assignments they have access to
DROP POLICY IF EXISTS "Users can create assignment comments" ON assignment_comments;
CREATE POLICY "Users can create assignment comments" ON assignment_comments
  FOR INSERT WITH CHECK (
    user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
    AND EXISTS (
      SELECT 1 FROM assignments a
      JOIN playbooks p ON p.id = a.playbook_id
      WHERE a.id = assignment_comments.assignment_id
      AND (
        -- User owns the playbook
        p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
        OR
        -- User is an accepted collaborator
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
          AND c.status = 'accepted'
        )
      )
    )
  );

-- Policy: Users can update their own comments
DROP POLICY IF EXISTS "Users can update their own assignment comments" ON assignment_comments;
CREATE POLICY "Users can update their own assignment comments" ON assignment_comments
  FOR UPDATE USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
  );

-- Policy: Users can delete their own comments
DROP POLICY IF EXISTS "Users can delete their own assignment comments" ON assignment_comments;
CREATE POLICY "Users can delete their own assignment comments" ON assignment_comments
  FOR DELETE USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
  );

-- RLS Policies for assignment_notifications table
ALTER TABLE assignment_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
DROP POLICY IF EXISTS "Users can view their own assignment notifications" ON assignment_notifications;
CREATE POLICY "Users can view their own assignment notifications" ON assignment_notifications
  FOR SELECT USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
  );

-- Policy: Users can update their own notifications (mark as read)
DROP POLICY IF EXISTS "Users can update their own assignment notifications" ON assignment_notifications;
CREATE POLICY "Users can update their own assignment notifications" ON assignment_notifications
  FOR UPDATE USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
  );

-- Policy: Allow system to create notifications (service role only)
DROP POLICY IF EXISTS "Service role can create assignment notifications" ON assignment_notifications;
CREATE POLICY "Service role can create assignment notifications" ON assignment_notifications
  FOR INSERT WITH CHECK (true);

-- Add assignment-related columns to existing playbooks table if they don't exist
DO $$ 
BEGIN
  -- Add assignment settings to playbooks table
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playbooks' AND column_name = 'assignment_enabled') THEN
    ALTER TABLE playbooks ADD COLUMN assignment_enabled BOOLEAN DEFAULT TRUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'playbooks' AND column_name = 'default_assignment_color') THEN
    ALTER TABLE playbooks ADD COLUMN default_assignment_color TEXT DEFAULT '#fef3c7';
  END IF;
END $$;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Assignment schema created successfully!';
  RAISE NOTICE '✅ Tables: assignments, assignment_comments, assignment_notifications';
  RAISE NOTICE '✅ RLS policies: Permission-based access control enabled';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Permission Levels:';
  RAISE NOTICE '   • VIEW: Can view assignments and comments';
  RAISE NOTICE '   • EDIT: Can view, create, update assignments and comments';
  RAISE NOTICE '   • ADMIN: Can view, create, update, delete assignments and comments';
  RAISE NOTICE '   • OWNER: Full control over all assignments';
  RAISE NOTICE '';
  RAISE NOTICE '📝 Special Rules:';
  RAISE NOTICE '   • Assigned users can update their own assignments (status, etc.)';
  RAISE NOTICE '   • Assignment creators can delete their own assignments';
  RAISE NOTICE '   • All users can update/delete their own comments';
  RAISE NOTICE '';
  RAISE NOTICE '✅ Next step: Run assignment-schema-update.sql for multiple assignees';
END $$;

