-- =============================================
-- Fix Invitation Schema Issues
-- =============================================

-- First, let's check if user_profiles table exists and create it if needed
CREATE TABLE IF NOT EXISTS user_profiles (
  id TEXT PRIMARY KEY,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add foreign key constraints to collaborators table
-- Note: These will only be added if the columns don't already have constraints

-- Add foreign key for user_id to user_profiles (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'collaborators_user_id_fkey' 
        AND table_name = 'collaborators'
    ) THEN
        ALTER TABLE collaborators 
        ADD CONSTRAINT collaborators_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for invited_by to user_profiles (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'collaborators_invited_by_fkey' 
        AND table_name = 'collaborators'
    ) THEN
        ALTER TABLE collaborators 
        ADD CONSTRAINT collaborators_invited_by_fkey 
        FOREIGN KEY (invited_by) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Add foreign key for chat_messages user_id to user_profiles (if not already exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'chat_messages_user_id_fkey' 
        AND table_name = 'chat_messages'
    ) THEN
        ALTER TABLE chat_messages 
        ADD CONSTRAINT chat_messages_user_id_fkey 
        FOREIGN KEY (user_id) REFERENCES user_profiles(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_display_name ON user_profiles(display_name);
CREATE INDEX IF NOT EXISTS idx_user_profiles_created_at ON user_profiles(created_at);

-- Update the RLS policies to include user_profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Create policy for user_profiles (simplified for Clerk auth)
CREATE POLICY "Allow all operations on user_profiles" ON user_profiles
    FOR ALL USING (true);

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
