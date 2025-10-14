-- =============================================
-- Setup Chat Messages Table for Real-time Chat
-- =============================================

-- Create chat_messages table if it doesn't exist
CREATE TABLE IF NOT EXISTS chat_messages (
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

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_chat_playbook ON chat_messages(playbook_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_user ON chat_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_created_at ON chat_messages(created_at DESC);

-- Enable realtime for chat messages
ALTER TABLE chat_messages REPLICA IDENTITY FULL;

-- Enable RLS
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Allow all operations on chat_messages" ON chat_messages;

-- Create simplified policy for Clerk authentication
-- Since we use Clerk auth, we need to handle authorization at the application level
CREATE POLICY "Allow all operations on chat_messages" ON chat_messages
    FOR ALL USING (true);

-- Note: In production with Clerk auth, you should either:
-- 1. Use Supabase service role key for all operations (bypasses RLS)
-- 2. Implement custom RLS policies that work with your Clerk user IDs
-- 3. Handle all authorization at the application level (current approach)
