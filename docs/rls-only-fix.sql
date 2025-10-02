-- Simple RLS fix - just disable RLS temporarily for testing
-- This will fix the "infinite recursion" error

ALTER TABLE playbooks DISABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_collaborators DISABLE ROW LEVEL SECURITY;
ALTER TABLE playbook_executions DISABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles DISABLE ROW LEVEL SECURITY;
