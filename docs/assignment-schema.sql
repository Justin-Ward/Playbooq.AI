-- Assignment functionality for Playbooq
-- This extends the existing schema to support assignment tracking

-- Create assignments table to store assignment metadata
CREATE TABLE IF NOT EXISTS assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  playbook_id UUID NOT NULL REFERENCES playbooks(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL, -- User ID of the assignee
  assigned_to_name TEXT NOT NULL, -- Display name of the assignee
  assigned_by UUID NOT NULL, -- User ID of the person who created the assignment
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
  user_id UUID NOT NULL, -- User ID of the commenter
  user_name TEXT NOT NULL, -- Display name of the commenter
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create assignment_notifications table for tracking notifications
CREATE TABLE IF NOT EXISTS assignment_notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id UUID NOT NULL, -- User who should receive the notification
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

CREATE TRIGGER trigger_update_assignment_comments_updated_at
  BEFORE UPDATE ON assignment_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_assignment_comments_updated_at();

-- RLS Policies for assignments table
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assignments for playbooks they have access to
CREATE POLICY "Users can view assignments for accessible playbooks" ON assignments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = assignments.playbook_id
      AND (
        p.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = auth.uid()
          AND c.status = 'accepted'
        )
      )
    )
  );

-- Policy: Users can create assignments for playbooks they can edit
CREATE POLICY "Users can create assignments for editable playbooks" ON assignments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = assignments.playbook_id
      AND (
        p.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = auth.uid()
          AND c.status = 'accepted'
          AND c.permission IN ('edit', 'admin')
        )
      )
    )
  );

-- Policy: Users can update assignments they created or are assigned to
CREATE POLICY "Users can update relevant assignments" ON assignments
  FOR UPDATE USING (
    assigned_to = auth.uid() OR
    assigned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = assignments.playbook_id
      AND p.user_id = auth.uid()
    )
  );

-- Policy: Users can delete assignments they created or are playbook owners
CREATE POLICY "Users can delete relevant assignments" ON assignments
  FOR DELETE USING (
    assigned_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM playbooks p
      WHERE p.id = assignments.playbook_id
      AND p.user_id = auth.uid()
    )
  );

-- RLS Policies for assignment_comments table
ALTER TABLE assignment_comments ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view comments for assignments they have access to
CREATE POLICY "Users can view assignment comments" ON assignment_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN playbooks p ON p.id = a.playbook_id
      WHERE a.id = assignment_comments.assignment_id
      AND (
        p.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = auth.uid()
          AND c.status = 'accepted'
        )
      )
    )
  );

-- Policy: Users can create comments for assignments they have access to
CREATE POLICY "Users can create assignment comments" ON assignment_comments
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN playbooks p ON p.id = a.playbook_id
      WHERE a.id = assignment_comments.assignment_id
      AND (
        p.user_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = auth.uid()
          AND c.status = 'accepted'
        )
      )
    )
  );

-- Policy: Users can update their own comments
CREATE POLICY "Users can update their own assignment comments" ON assignment_comments
  FOR UPDATE USING (user_id = auth.uid());

-- Policy: Users can delete their own comments
CREATE POLICY "Users can delete their own assignment comments" ON assignment_comments
  FOR DELETE USING (user_id = auth.uid());

-- RLS Policies for assignment_notifications table
ALTER TABLE assignment_notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own notifications
CREATE POLICY "Users can view their own assignment notifications" ON assignment_notifications
  FOR SELECT USING (user_id = auth.uid());

-- Policy: Users can update their own notifications
CREATE POLICY "Users can update their own assignment notifications" ON assignment_notifications
  FOR UPDATE USING (user_id = auth.uid());

-- Policy: System can create notifications (this would be handled by service role)
CREATE POLICY "System can create assignment notifications" ON assignment_notifications
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
