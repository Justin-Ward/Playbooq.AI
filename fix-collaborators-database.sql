-- =============================================
-- Fix Collaborators Database Issues
-- =============================================

-- Drop ALL existing policies that use auth.uid() (since we use Clerk, not Supabase Auth)
DROP POLICY IF EXISTS "Users can view collaborators of accessible playbooks" ON collaborators;
DROP POLICY IF EXISTS "Playbook owners can manage collaborators" ON collaborators;
DROP POLICY IF EXISTS "Users can update their own collaboration status" ON collaborators;
DROP POLICY IF EXISTS "Users can view chat messages for accessible playbooks" ON chat_messages;
DROP POLICY IF EXISTS "Collaborators can send chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can edit their own chat messages" ON chat_messages;
DROP POLICY IF EXISTS "Users can create their own playbooks" ON playbooks;
DROP POLICY IF EXISTS "Users can update their own playbooks" ON playbooks;
DROP POLICY IF EXISTS "Users can view their own playbooks" ON playbooks;
DROP POLICY IF EXISTS "Users can manage their own profile" ON user_profiles;

-- Keep only the policies that don't depend on auth.uid()
-- (Users can view public playbooks and Users can view all profiles)

-- Create simplified policies for Clerk authentication
-- Since we use Clerk auth, we need to handle authorization at the application level
-- These policies allow all operations - proper auth will be handled by the app

CREATE POLICY "Allow all operations on collaborators" ON collaborators
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_messages" ON chat_messages
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on playbooks" ON playbooks
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on user_profiles" ON user_profiles
    FOR ALL USING (true);

-- Note: In production with Clerk auth, you should either:
-- 1. Use Supabase service role key for all operations (bypasses RLS)
-- 2. Implement custom RLS policies that work with your Clerk user IDs
-- 3. Handle all authorization at the application level (current approach)

-- =============================================
-- FIX USER_ID CONSTRAINT FOR INVITATIONS
-- =============================================

-- Make user_id nullable so we can create invitations before user accepts
ALTER TABLE collaborators ALTER COLUMN user_id DROP NOT NULL;

-- Update the unique constraint to handle null user_ids
-- We'll use a partial unique index instead
DROP INDEX IF EXISTS idx_collaborators_playbook_user;
CREATE UNIQUE INDEX idx_collaborators_playbook_user_unique 
ON collaborators(playbook_id, user_id) 
WHERE user_id IS NOT NULL;

-- Add a separate constraint for email uniqueness per playbook
CREATE UNIQUE INDEX idx_collaborators_playbook_email_unique 
ON collaborators(playbook_id, user_email);
