-- =============================================
-- Update Inviter Profile with Better Display Name
-- =============================================

-- Update the existing inviter profile with a better display name
-- Replace 'user_33WMB6tWj7by6hHdVaLPH0QDAmK' with the actual user ID from your collaborators table

-- First, let's see what inviter IDs exist in the collaborators table
SELECT DISTINCT invited_by, COUNT(*) as invitation_count 
FROM collaborators 
GROUP BY invited_by;

-- Update the user profile for the inviter with a more readable name
-- Replace 'user_33WMB6tWj7by6hHdVaLPH0QDAmK' with the actual ID from the query above
UPDATE user_profiles 
SET 
    display_name = 'Playbooq Administrator',
    updated_at = NOW()
WHERE id = 'user_33WMB6tWj7by6hHdVaLPH0QDAmK';

-- If you want to use a different name, you can change 'Playbooq Administrator' to whatever you prefer
-- Examples:
-- 'Playbooq Administrator'
-- 'System Administrator' 
-- 'Your Name' (if you know who it should be)

-- Verify the update
SELECT id, display_name, avatar_url, created_at, updated_at 
FROM user_profiles 
WHERE id = 'user_33WMB6tWj7by6hHdVaLPH0QDAmK';
