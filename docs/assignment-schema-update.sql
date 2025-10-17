-- Update assignment schema to support multiple assignees
-- This file adds support for many-to-many relationship between assignments and assignees

-- Create assignment_assignees junction table for multiple assignees per assignment
CREATE TABLE IF NOT EXISTS assignment_assignees (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assignment_id UUID NOT NULL REFERENCES assignments(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL, -- Can be a real user ID or manual_TIMESTAMP for manual entries
  user_name TEXT NOT NULL,
  user_email TEXT, -- Optional, only for collaborators
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_assignment_assignees_assignment_id ON assignment_assignees(assignment_id);
CREATE INDEX IF NOT EXISTS idx_assignment_assignees_user_id ON assignment_assignees(user_id);

-- RLS Policies for assignment_assignees table
ALTER TABLE assignment_assignees ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view assignees for assignments they have access to
DROP POLICY IF EXISTS "Users can view assignment assignees" ON assignment_assignees;
CREATE POLICY "Users can view assignment assignees" ON assignment_assignees
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN playbooks p ON p.id = a.playbook_id
      WHERE a.id = assignment_assignees.assignment_id
      AND (
        p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
        OR
        EXISTS (
          SELECT 1 FROM collaborators c
          WHERE c.playbook_id = p.id
          AND c.user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
          AND c.status = 'accepted'
        )
      )
    )
  );

-- Policy: Users can create assignees for assignments they can edit
DROP POLICY IF EXISTS "Users can create assignment assignees" ON assignment_assignees;
CREATE POLICY "Users can create assignment assignees" ON assignment_assignees
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN playbooks p ON p.id = a.playbook_id
      WHERE a.id = assignment_assignees.assignment_id
      AND (
        p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
        OR
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

-- Policy: Users can delete assignees from assignments they can edit
DROP POLICY IF EXISTS "Users can delete assignment assignees" ON assignment_assignees;
CREATE POLICY "Users can delete assignment assignees" ON assignment_assignees
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM assignments a
      JOIN playbooks p ON p.id = a.playbook_id
      WHERE a.id = assignment_assignees.assignment_id
      AND (
        p.owner_id = current_setting('request.jwt.claims', true)::json->>'user_id'
        OR
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

-- Add a view to easily get all assignees for an assignment
CREATE OR REPLACE VIEW assignment_with_assignees AS
SELECT 
  a.*,
  COALESCE(
    string_agg(aa.user_name, ', ' ORDER BY aa.created_at),
    a.assigned_to_name
  ) AS all_assignee_names,
  COALESCE(
    string_agg(aa.user_id, ',' ORDER BY aa.created_at),
    a.assigned_to
  ) AS all_assignee_ids,
  COUNT(aa.id) AS assignee_count
FROM assignments a
LEFT JOIN assignment_assignees aa ON aa.assignment_id = a.id
GROUP BY a.id;

-- Note: The existing 'assigned_to' and 'assigned_to_name' columns in the assignments table
-- will continue to work for backward compatibility. They will store comma-separated values
-- for multiple assignees. The assignment_assignees table provides a more normalized structure
-- for querying and managing multiple assignees.

-- Migration note: If you want to migrate existing assignments to use the new table structure,
-- you can run this after creating the assignment_assignees table:
/*
INSERT INTO assignment_assignees (assignment_id, user_id, user_name)
SELECT 
  a.id,
  TRIM(assignee_id.value),
  TRIM(assignee_name.value)
FROM assignments a
CROSS JOIN LATERAL unnest(string_to_array(a.assigned_to, ',')) WITH ORDINALITY AS assignee_id(value, ord)
CROSS JOIN LATERAL unnest(string_to_array(a.assigned_to_name, ',')) WITH ORDINALITY AS assignee_name(value, ord)
WHERE assignee_id.ord = assignee_name.ord
  AND a.assigned_to IS NOT NULL 
  AND a.assigned_to != ''
  AND NOT EXISTS (
    SELECT 1 FROM assignment_assignees aa 
    WHERE aa.assignment_id = a.id
  );
*/
