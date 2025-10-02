-- =============================================
-- Playbooq.AI Database Schema
-- =============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row Level Security
ALTER DATABASE postgres SET "app.jwt_secret" TO 'your-jwt-secret-here';

-- =============================================
-- CORE TABLES
-- =============================================

-- Core playbooks table
CREATE TABLE playbooks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title TEXT NOT NULL DEFAULT 'Untitled Playbook',
  description TEXT DEFAULT '',
  content JSONB DEFAULT '{}',
  owner_id TEXT NOT NULL,
  is_public BOOLEAN DEFAULT false,
  is_template BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  category TEXT DEFAULT 'general',
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Playbook collaborators table (for sharing)
CREATE TABLE playbook_collaborators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  permission TEXT NOT NULL CHECK (permission IN ('read', 'write', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(playbook_id, user_id)
);

-- Playbook executions/runs table
CREATE TABLE playbook_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  playbook_id UUID REFERENCES playbooks(id) ON DELETE CASCADE,
  executor_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed', 'cancelled')),
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER
);

-- User profiles table (extends Clerk user data)
CREATE TABLE user_profiles (
  id TEXT PRIMARY KEY, -- Clerk user ID
  display_name TEXT,
  bio TEXT,
  avatar_url TEXT,
  preferences JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =============================================
-- INDEXES FOR PERFORMANCE
-- =============================================

-- Playbooks indexes
CREATE INDEX idx_playbooks_owner ON playbooks(owner_id);
CREATE INDEX idx_playbooks_updated ON playbooks(updated_at DESC);
CREATE INDEX idx_playbooks_public ON playbooks(is_public) WHERE is_public = true;
CREATE INDEX idx_playbooks_template ON playbooks(is_template) WHERE is_template = true;
CREATE INDEX idx_playbooks_category ON playbooks(category);
CREATE INDEX idx_playbooks_tags ON playbooks USING GIN(tags);

-- Collaborators indexes
CREATE INDEX idx_collaborators_playbook ON playbook_collaborators(playbook_id);
CREATE INDEX idx_collaborators_user ON playbook_collaborators(user_id);

-- Executions indexes
CREATE INDEX idx_executions_playbook ON playbook_executions(playbook_id);
CREATE INDEX idx_executions_executor ON playbook_executions(executor_id);
CREATE INDEX idx_executions_status ON playbook_executions(status);
CREATE INDEX idx_executions_started ON playbook_executions(started_at DESC);

-- User profiles indexes
CREATE INDEX idx_profiles_display_name ON user_profiles(display_name);

-- =============================================
-- TRIGGERS FOR AUTO-UPDATING TIMESTAMPS
-- =============================================

-- Function to auto-update updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to playbooks table
CREATE TRIGGER update_playbooks_updated_at 
    BEFORE UPDATE ON playbooks 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- Apply trigger to user_profiles table
CREATE TRIGGER update_user_profiles_updated_at 
    BEFORE UPDATE ON user_profiles 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- =============================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =============================================

-- Enable RLS on all tables
ALTER TABLE playbooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Playbooks policies
CREATE POLICY "Users can view their own playbooks" ON playbooks
    FOR SELECT USING (auth.uid()::text = owner_id);

CREATE POLICY "Users can view public playbooks" ON playbooks
    FOR SELECT USING (is_public = true);

CREATE POLICY "Users can view playbooks they collaborate on" ON playbooks
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM playbook_collaborators 
            WHERE playbook_id = playbooks.id 
            AND user_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can create their own playbooks" ON playbooks
    FOR INSERT WITH CHECK (auth.uid()::text = owner_id);

CREATE POLICY "Users can update their own playbooks" ON playbooks
    FOR UPDATE USING (auth.uid()::text = owner_id);

CREATE POLICY "Collaborators can update playbooks with write permission" ON playbooks
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM playbook_collaborators 
            WHERE playbook_id = playbooks.id 
            AND user_id = auth.uid()::text 
            AND permission IN ('write', 'admin')
        )
    );

CREATE POLICY "Users can delete their own playbooks" ON playbooks
    FOR DELETE USING (auth.uid()::text = owner_id);

-- Collaborators policies
CREATE POLICY "Users can view collaborators of their playbooks" ON playbook_collaborators
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM playbooks 
            WHERE id = playbook_id 
            AND owner_id = auth.uid()::text
        )
    );

CREATE POLICY "Users can manage collaborators of their playbooks" ON playbook_collaborators
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM playbooks 
            WHERE id = playbook_id 
            AND owner_id = auth.uid()::text
        )
    );

-- Executions policies
CREATE POLICY "Users can view executions of their playbooks" ON playbook_executions
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM playbooks 
            WHERE id = playbook_id 
            AND owner_id = auth.uid()::text
        )
        OR executor_id = auth.uid()::text
    );

CREATE POLICY "Users can create executions for accessible playbooks" ON playbook_executions
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM playbooks 
            WHERE id = playbook_id 
            AND (
                owner_id = auth.uid()::text 
                OR is_public = true
                OR EXISTS (
                    SELECT 1 FROM playbook_collaborators 
                    WHERE playbook_id = playbooks.id 
                    AND user_id = auth.uid()::text
                )
            )
        )
        AND executor_id = auth.uid()::text
    );

-- User profiles policies
CREATE POLICY "Users can view all profiles" ON user_profiles
    FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users can manage their own profile" ON user_profiles
    FOR ALL USING (auth.uid()::text = id);

-- =============================================
-- SAMPLE DATA (OPTIONAL - FOR DEVELOPMENT)
-- =============================================

-- Uncomment the following to insert sample data for development
/*
INSERT INTO user_profiles (id, display_name, bio) VALUES
('user_sample_1', 'John Doe', 'AI enthusiast and automation expert'),
('user_sample_2', 'Jane Smith', 'Productivity coach and workflow designer');

INSERT INTO playbooks (title, description, content, owner_id, is_public, category, tags) VALUES
('Welcome to Playbooq', 'A sample playbook to get you started', '{"steps": [{"type": "text", "content": "Welcome to your first playbook!"}]}', 'user_sample_1', true, 'tutorial', ARRAY['welcome', 'tutorial']),
('Daily Standup Template', 'Template for daily team standups', '{"steps": [{"type": "question", "content": "What did you work on yesterday?"}, {"type": "question", "content": "What will you work on today?"}, {"type": "question", "content": "Any blockers?"}]}', 'user_sample_1', true, 'template', ARRAY['standup', 'team', 'template']);
*/

-- =============================================
-- FUNCTIONS FOR COMMON OPERATIONS
-- =============================================

-- Function to get user's accessible playbooks
CREATE OR REPLACE FUNCTION get_user_playbooks(user_id TEXT)
RETURNS TABLE (
    id UUID,
    title TEXT,
    description TEXT,
    owner_id TEXT,
    is_public BOOLEAN,
    category TEXT,
    tags TEXT[],
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    permission TEXT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        p.id,
        p.title,
        p.description,
        p.owner_id,
        p.is_public,
        p.category,
        p.tags,
        p.created_at,
        p.updated_at,
        CASE 
            WHEN p.owner_id = user_id THEN 'admin'
            ELSE COALESCE(pc.permission, 'read')
        END as permission
    FROM playbooks p
    LEFT JOIN playbook_collaborators pc ON p.id = pc.playbook_id AND pc.user_id = user_id
    WHERE 
        p.owner_id = user_id 
        OR p.is_public = true 
        OR pc.user_id = user_id
    ORDER BY p.updated_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
