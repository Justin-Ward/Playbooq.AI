-- Assignment functionality for Playbooq
-- Fixed version compatible with Clerk authentication and existing schema

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
-- Note: Using simple policies that work with Clerk. Adjust based on your auth setup.
ALTER TABLE assignments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all operations for now (you can tighten this later based on your auth setup)
DROP POLICY IF EXISTS "Enable all for assignments" ON assignments;
CREATE POLICY "Enable all for assignments" ON assignments
  FOR ALL USING (true);

-- RLS Policies for assignment_comments table
ALTER TABLE assignment_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for assignment_comments" ON assignment_comments;
CREATE POLICY "Enable all for assignment_comments" ON assignment_comments
  FOR ALL USING (true);

-- RLS Policies for assignment_notifications table
ALTER TABLE assignment_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all for assignment_notifications" ON assignment_notifications;
CREATE POLICY "Enable all for assignment_notifications" ON assignment_notifications
  FOR ALL USING (true);

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
  RAISE NOTICE 'Assignment schema created successfully!';
  RAISE NOTICE 'Tables created: assignments, assignment_comments, assignment_notifications';
  RAISE NOTICE 'Note: RLS policies are currently set to "allow all" for simplicity.';
  RAISE NOTICE 'You can tighten security later based on your authentication setup.';
END $$;

