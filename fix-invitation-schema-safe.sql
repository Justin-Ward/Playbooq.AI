-- =============================================
-- Fix Invitation Schema Issues (Safe Version)
-- =============================================

-- First, let's check if user_profiles table exists and create it if needed
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Update the RLS policies to include user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_profiles (simplified for Clerk auth)
DROP POLICY IF EXISTS "Allow all operations on user_profiles" ON user_profiles;
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles
    FOR ALL USING (true);

-- =============================================
-- Handle Existing Data Before Adding Constraints
-- =============================================

-- Create user profiles for existing collaborators who don't have profiles
INSERT INTO user_profiles (id, display_name, created_at)
SELECT DISTINCT 
    c.user_id as id,
    COALESCE(c.user_name, c.user_email) as display_name,
    NOW() as created_at
FROM collaborators c
WHERE c.user_id IS NOT NULL 
  AND c.user_id NOT IN (SELECT id FROM user_profiles);

-- Create user profiles for existing inviters who don't have profiles
INSERT INTO user_profiles (id, display_name, created_at)
SELECT DISTINCT 
    c.invited_by as id,
    c.invited_by as display_name,  -- Use the user_id as display_name for now
    NOW() as created_at
FROM collaborators c
WHERE c.invited_by IS NOT NULL 
  AND c.invited_by NOT IN (SELECT id FROM user_profiles);

-- =============================================
-- Add Foreign Key Constraints (Now Safe)
-- =============================================

-- Drop existing constraints if they exist
ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_user_id_fkey;
ALTER TABLE collaborators DROP CONSTRAINT IF EXISTS collaborators_invited_by_fkey;
ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_user_id_fkey;

-- Add foreign key for user_id to user_profiles (only for non-null values)
DO $$
BEGIN
    -- First, update any NULL user_ids to prevent constraint issues
    UPDATE collaborators SET user_id = NULL WHERE user_id = '';
    
    -- Add the constraint
    ALTER TABLE collaborators 
    ADD CONSTRAINT collaborators_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add user_id foreign key: %', SQLERRM;
END $$;

-- Add foreign key for invited_by to user_profiles
DO $$
BEGIN
    ALTER TABLE collaborators 
    ADD CONSTRAINT collaborators_invited_by_fkey 
    FOREIGN KEY (invited_by) REFERENCES user_profiles(id) ON DELETE SET NULL;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add invited_by foreign key: %', SQLERRM;
END $$;

-- Add foreign key for chat_messages user_id to user_profiles
DO $$
BEGIN
    ALTER TABLE chat_messages 
    ADD CONSTRAINT chat_messages_user_id_fkey 
    FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Could not add chat_messages user_id foreign key: %', SQLERRM;
END $$;

-- =============================================
-- Update Functions to Work with Clerk Auth
-- =============================================

-- Update the invite_collaborator function to work without Supabase Auth
CREATE OR REPLACE FUNCTION invite_collaborator(
    p_playbook_id UUID,
    p_user_email TEXT,
    p_user_name TEXT,
    p_permission_level TEXT,
    p_inviter_id TEXT
)
RETURNS UUID AS $$
DECLARE
    v_collaborator_id UUID;
BEGIN
    -- Ensure inviter profile exists
    INSERT INTO user_profiles (id, display_name, created_at)
    VALUES (p_inviter_id, COALESCE(p_user_name, p_inviter_id), NOW())
    ON CONFLICT (id) DO NOTHING;
    
    -- Check if inviter owns the playbook
    IF NOT EXISTS (
        SELECT 1 FROM playbooks 
        WHERE id = p_playbook_id 
        AND owner_id = p_inviter_id
    ) THEN
        RAISE EXCEPTION 'You can only invite collaborators to your own playbooks';
    END IF;
    
    -- Insert the collaborator invitation
    INSERT INTO collaborators (
        playbook_id, 
        user_email, 
        user_name, 
        permission_level, 
        invited_by,
        status
    ) VALUES (
        p_playbook_id, 
        p_user_email, 
        p_user_name, 
        p_permission_level, 
        p_inviter_id,
        'pending'
    ) RETURNING id INTO v_collaborator_id;
    
    RETURN v_collaborator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the accept_collaboration function to work with Clerk user IDs
CREATE OR REPLACE FUNCTION accept_collaboration(
    p_collaborator_id UUID,
    p_user_id TEXT,
    p_user_email TEXT
)
RETURNS BOOLEAN AS $$
BEGIN
    -- Ensure user profile exists
    INSERT INTO user_profiles (id, display_name, created_at)
    VALUES (p_user_id, p_user_email, NOW())
    ON CONFLICT (id) DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        updated_at = NOW();
    
    -- Update the collaboration status
    UPDATE collaborators 
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        user_id = p_user_id
    WHERE 
        id = p_collaborator_id 
        AND user_email = p_user_email;
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Create Helper Functions for Clerk Integration
-- =============================================

-- Function to create or update user profile
CREATE OR REPLACE FUNCTION upsert_user_profile(
    p_user_id TEXT,
    p_display_name TEXT DEFAULT NULL,
    p_avatar_url TEXT DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO user_profiles (id, display_name, avatar_url)
    VALUES (p_user_id, p_display_name, p_avatar_url)
    ON CONFLICT (id) 
    DO UPDATE SET
        display_name = COALESCE(EXCLUDED.display_name, user_profiles.display_name),
        avatar_url = COALESCE(EXCLUDED.avatar_url, user_profiles.avatar_url),
        updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get collaborator with profile info
CREATE OR REPLACE FUNCTION get_collaborator_with_profile(p_collaborator_id UUID)
RETURNS TABLE (
    id UUID,
    playbook_id UUID,
    user_id TEXT,
    user_email TEXT,
    user_name TEXT,
    permission_level TEXT,
    invited_by TEXT,
    invited_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    status TEXT,
    user_profile_display_name TEXT,
    user_profile_avatar_url TEXT,
    inviter_profile_display_name TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.playbook_id,
        c.user_id,
        c.user_email,
        c.user_name,
        c.permission_level,
        c.invited_by,
        c.invited_at,
        c.accepted_at,
        c.status,
        up.display_name,
        up.avatar_url,
        ip.display_name
    FROM collaborators c
    LEFT JOIN user_profiles up ON c.user_id = up.id
    LEFT JOIN user_profiles ip ON c.invited_by = ip.id
    WHERE c.id = p_collaborator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- Verification Queries
-- =============================================

-- Check if all constraints were added successfully
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('collaborators', 'chat_messages')
ORDER BY tc.table_name, tc.constraint_name;

-- Check user profiles count
SELECT 'user_profiles' as table_name, COUNT(*) as count FROM user_profiles
UNION ALL
SELECT 'collaborators' as table_name, COUNT(*) as count FROM collaborators
UNION ALL
SELECT 'chat_messages' as table_name, COUNT(*) as count FROM chat_messages;
