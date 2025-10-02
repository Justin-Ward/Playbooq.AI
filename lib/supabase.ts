import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

// Get environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

// Check if we have valid Supabase credentials
export const isSupabaseConfigured = Boolean(
  supabaseUrl && 
  supabaseAnonKey && 
  supabaseUrl.startsWith('https://') && 
  supabaseAnonKey.startsWith('eyJ')
)

// Create a single supabase client for interacting with your database
export const supabase = createClient<Database>(
  supabaseUrl || 'https://placeholder.supabase.co', 
  supabaseAnonKey || 'placeholder_key', 
  {
    auth: {
      autoRefreshToken: isSupabaseConfigured,
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured
    }
  }
)

// Client-side helper function
export const createSupabaseClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true
    }
  })
}

// Server-side helper function for API routes
export const createSupabaseServerClient = () => {
  return createClient<Database>(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}

// Helper function to handle Supabase errors
export const handleSupabaseError = (error: any) => {
  if (error?.code) {
    console.error('Supabase error:', error.message, error.code)
    return {
      error: true,
      message: error.message || 'Database operation failed',
      code: error.code
    }
  }
  
  console.error('Unknown error:', error)
  return {
    error: true,
    message: 'An unexpected error occurred',
    code: 'UNKNOWN_ERROR'
  }
}

// Helper function to check if Supabase is properly configured
export const isSupabaseReady = () => isSupabaseConfigured

// Helper function to check if user is authenticated
export const checkAuth = async () => {
  if (!isSupabaseConfigured) {
    return { 
      authenticated: false, 
      user: null, 
      error: { message: 'Supabase not configured' } 
    }
  }

  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Auth check error:', error)
    return { authenticated: false, user: null, error }
  }
  
  return {
    authenticated: !!session,
    user: session?.user || null,
    error: null
  }
}
