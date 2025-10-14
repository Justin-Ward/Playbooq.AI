-- =============================================
-- Collaboration Tables for Playbooq.AI
-- =============================================

-- Enhanced collaborators table with invitation system
CREATE TABLE collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_name TEXT,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('owner', 'edit', 'view')),
  invited_by TEXT NOT NULL,
  invited_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  accepted_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  UNIQUE(playbook_id, user_id)
);

-- Indexes for collaborators table
CREATE INDEX idx_collaborators_playbook ON collaborators(playbook_id);
CREATE INDEX idx_collaborators_user ON collaborators(user_id);
CREATE INDEX idx_collaborators_status ON collaborators(status);
CREATE INDEX idx_collaborators_invited_at ON collaborators(invited_at DESC);

-- Chat messages table for real-time collaboration
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  user_avatar TEXT,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  edited_at TIMESTAMP WITH TIME ZONE,
  deleted BOOLEAN DEFAULT FALSE
);

-- Indexes for chat_messages table
CREATE INDEX idx_chat_playbook ON chat_messages(playbook_id, created_at DESC);
CREATE INDEX idx_chat_user ON chat_messages(user_id);
CREATE INDEX idx_chat_created_at ON chat_messages(created_at DESC);

-- Enable realtime for chat messages
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on collaboration tables
ALTER TABLE collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- IMPORTANT: These policies are designed for Clerk authentication, not Supabase Auth
-- Since we use Clerk auth, auth.uid() will not work and causes infinite recursion errors
-- All authorization is handled at the application level

-- Simplified policies for Clerk authentication
CREATE POLICY "Allow all operations on collaborators" ON collaborators
    FOR ALL USING (true);

CREATE POLICY "Allow all operations on chat_messages" ON chat_messages
    FOR ALL USING (true);

-- Note: In production with Clerk auth, you should either:
-- 1. Use Supabase service role key for all operations (bypasses RLS)
-- 2. Implement custom RLS policies that work with your Clerk user IDs
-- 3. Handle all authorization at the application level (current approach)

-- =============================================
-- FUNCTIONS FOR COLLABORATION
-- =============================================

-- Function to invite a collaborator
CREATE OR REPLACE FUNCTION invite_collaborator(
    p_playbook_id UUID,
    p_user_email TEXT,
    p_user_name TEXT,
    p_permission_level TEXT
)
RETURNS UUID AS $$
DECLARE
    v_collaborator_id UUID;
    v_inviter_id TEXT;
BEGIN
    -- Get the current user ID
    v_inviter_id := auth.uid()::text;
    
    -- Check if user owns the playbook
    IF NOT EXISTS (
        SELECT 1 FROM playbooks 
        WHERE id = p_playbook_id 
        AND owner_id = v_inviter_id
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
        v_inviter_id,
        'pending'
    ) RETURNING id INTO v_collaborator_id;
    
    RETURN v_collaborator_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to accept collaboration invitation
CREATE OR REPLACE FUNCTION accept_collaboration(p_collaborator_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_user_id TEXT;
BEGIN
    -- Get the current user ID
    v_user_id := auth.uid()::text;
    
    -- Update the collaboration status
    UPDATE collaborators 
    SET 
        status = 'accepted',
        accepted_at = NOW(),
        user_id = v_user_id
    WHERE 
        id = p_collaborator_id 
        AND user_email = (
            SELECT email FROM auth.users WHERE id = v_user_id
        );
    
    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get playbook collaborators
CREATE OR REPLACE FUNCTION get_playbook_collaborators(p_playbook_id UUID)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    user_email TEXT,
    user_name TEXT,
    permission_level TEXT,
    invited_by TEXT,
    invited_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    status TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.id,
        c.user_id,
        c.user_email,
        c.user_name,
        c.permission_level,
        c.invited_by,
        c.invited_at,
        c.accepted_at,
        c.status
    FROM collaborators c
    WHERE c.playbook_id = p_playbook_id
    ORDER BY c.invited_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get chat messages for a playbook
CREATE OR REPLACE FUNCTION get_playbook_chat_messages(
    p_playbook_id UUID,
    p_limit INTEGER DEFAULT 50,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    user_id TEXT,
    user_name TEXT,
    user_avatar TEXT,
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    edited_at TIMESTAMP WITH TIME ZONE,
    deleted BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cm.id,
        cm.user_id,
        cm.user_name,
        cm.user_avatar,
        cm.message,
        cm.created_at,
        cm.edited_at,
        cm.deleted
    FROM chat_messages cm
    WHERE 
        cm.playbook_id = p_playbook_id
        AND cm.deleted = false
    ORDER BY cm.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

