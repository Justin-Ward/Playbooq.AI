# Supabase Setup Guide for Playbooq.AI

This guide will walk you through setting up Supabase for your Playbooq.AI application.

## Prerequisites

- A [Supabase account](https://supabase.com)
- Your Next.js application with Supabase client installed

## Step 1: Create a New Supabase Project

1. **Sign in to Supabase**
   - Go to [supabase.com](https://supabase.com)
   - Sign in to your account (or create one if you don't have it)

2. **Create a New Project**
   - Click "New Project" in your dashboard
   - Choose your organization
   - Fill in project details:
     - **Name**: `playbooq-ai` (or your preferred name)
     - **Database Password**: Use a strong password (save this!)
     - **Region**: Choose the region closest to your users
     - **Pricing Plan**: Start with the free tier

3. **Wait for Setup**
   - Project creation takes 1-2 minutes
   - You'll see a progress indicator

## Step 2: Run the Database Schema

1. **Access SQL Editor**
   - In your Supabase dashboard, go to **SQL Editor** in the sidebar
   - Click "New Query"

2. **Execute the Schema**
   - Copy the entire contents of `docs/schema.sql`
   - Paste it into the SQL Editor
   - Click "Run" to execute the schema
   - You should see "Success. No rows returned" message

3. **Verify Tables Created**
   - Go to **Table Editor** in the sidebar
   - You should see the following tables:
     - `playbooks`
     - `playbook_collaborators`
     - `playbook_executions`
     - `user_profiles`

## Step 3: Get Your Project Credentials

1. **Navigate to Settings**
   - In your Supabase dashboard, click **Settings** → **API**

2. **Copy Project URL**
   - Find "Project URL" section
   - Copy the URL (format: `https://your-project-id.supabase.co`)

3. **Copy API Keys**
   - Find "Project API keys" section
   - Copy the **anon public** key (this is safe for client-side use)
   - **Note**: Keep the **service_role** key secret (for server-side operations only)

## Step 4: Configure Environment Variables

1. **Update .env.local**
   - Open your `.env.local` file in the project root
   - Replace the placeholder values:

```bash
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. **Example**
```bash
# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Step 5: Test the Connection

1. **Create a Test Component**
   Create `components/SupabaseTest.tsx`:

```tsx
'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function SupabaseTest() {
  const [connected, setConnected] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function testConnection() {
      try {
        const { data, error } = await supabase
          .from('playbooks')
          .select('count')
          .limit(1)

        if (error) throw error
        setConnected(true)
      } catch (err: any) {
        setError(err.message)
        setConnected(false)
      }
    }

    testConnection()
  }, [])

  return (
    <div className="p-4 border rounded">
      <h3 className="font-bold">Supabase Connection Test</h3>
      {connected === null && <p>Testing connection...</p>}
      {connected === true && (
        <p className="text-green-600">✅ Connected successfully!</p>
      )}
      {connected === false && (
        <p className="text-red-600">❌ Connection failed: {error}</p>
      )}
    </div>
  )
}
```

2. **Add to Your Page**
   - Import and add `<SupabaseTest />` to any page
   - Visit the page to test the connection

## Step 6: Set Up Row Level Security (Optional but Recommended)

The schema already includes RLS policies, but you may want to customize them:

1. **Review Policies**
   - Go to **Authentication** → **Policies** in Supabase dashboard
   - Review the automatically created policies

2. **Test with Authenticated Users**
   - The policies are designed to work with Clerk authentication
   - Users can only access their own playbooks or public ones

## Step 7: Enable Realtime (Optional)

For real-time features like collaborative editing:

1. **Go to Database Settings**
   - **Database** → **Replication** in Supabase dashboard

2. **Enable Realtime**
   - Toggle realtime for tables you want to sync:
     - `playbooks` (for collaborative editing)
     - `playbook_executions` (for real-time execution status)

## Common Issues & Solutions

### Issue: "relation does not exist" error
**Solution**: Make sure you ran the complete schema.sql file in the SQL Editor.

### Issue: "JWT expired" or authentication errors
**Solution**: Check that your environment variables are correct and restart your dev server.

### Issue: RLS policies blocking queries
**Solution**: Ensure you're authenticated with Clerk before making Supabase queries.

### Issue: CORS errors in development
**Solution**: Add your local development URL to allowed origins in Supabase settings.

## Next Steps

Once Supabase is set up:

1. **Integrate with Clerk**: Ensure Clerk user IDs match the `owner_id` and `user_id` fields
2. **Create API Routes**: Build Next.js API routes for CRUD operations
3. **Add Validation**: Implement proper data validation on both client and server
4. **Set Up Monitoring**: Use Supabase's built-in monitoring and logging

## Environment Setup Summary

Your `.env.local` should now include:

```bash
# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key
CLERK_SECRET_KEY=your_clerk_secret_key

# Supabase Database
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# Other services...
ANTHROPIC_API_KEY=your_anthropic_api_key
# ... rest of your environment variables
```

## Production Considerations

When deploying to production:

1. **Use Environment Variables**: Never commit real API keys to version control
2. **Set Up Separate Environments**: Create separate Supabase projects for dev/staging/prod
3. **Enable Database Backups**: Configure automatic backups in Supabase settings
4. **Monitor Usage**: Keep an eye on your database usage and API limits
5. **Security**: Regularly review and update RLS policies

## Support

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Discord Community](https://discord.supabase.com)
- [Next.js + Supabase Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-nextjs)

Happy building! 🚀
