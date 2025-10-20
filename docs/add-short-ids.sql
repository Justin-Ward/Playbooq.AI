-- Add short_id columns to tables for shorter URLs
-- This maintains backward compatibility with existing UUIDs

-- Add short_id to playbooks table
ALTER TABLE playbooks 
ADD COLUMN short_id TEXT UNIQUE;

-- Add short_id to user_profiles table (for profile URLs)
ALTER TABLE user_profiles 
ADD COLUMN short_id TEXT UNIQUE;

-- Create indexes for better performance
CREATE INDEX idx_playbooks_short_id ON playbooks(short_id);
CREATE INDEX idx_user_profiles_short_id ON user_profiles(short_id);

-- Add RLS policies for short_id columns
-- These inherit the same permissions as the main table

-- For playbooks short_id
CREATE POLICY "Users can view playbook short_ids if they can view the playbook" ON playbooks
  FOR SELECT USING (
    user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
    OR id IN (
      SELECT playbook_id FROM collaborators 
      WHERE user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
      AND status = 'accepted'
    )
  );

-- For user_profiles short_id
CREATE POLICY "Users can view profile short_ids if they can view the profile" ON user_profiles
  FOR SELECT USING (
    id = current_setting('request.jwt.claims', true)::json->>'user_id'
    OR id IN (
      SELECT user_id FROM collaborators 
      WHERE playbook_id IN (
        SELECT id FROM playbooks 
        WHERE user_id = current_setting('request.jwt.claims', true)::json->>'user_id'
      )
      AND status = 'accepted'
    )
  );

-- Note: After running this, you'll need to populate the short_id columns
-- for existing records using your application logic

