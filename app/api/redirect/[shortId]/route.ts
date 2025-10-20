import { NextRequest, NextResponse } from 'next/server'
import { createSupabaseClient } from '@/lib/supabase'
import { isValidShortId, isValidUUID } from '@/lib/utils/shortId'

export async function GET(
  request: NextRequest,
  { params }: { params: { shortId: string } }
) {
  try {
    const { shortId } = params
    
    if (!shortId) {
      return NextResponse.json({ error: 'Short ID is required' }, { status: 400 })
    }
    
    const supabase = createSupabaseClient()
    
    // Check if it's a short ID or UUID
    if (isValidShortId(shortId)) {
      // It's a short ID, find the corresponding record
      const { data: playbook, error: playbookError } = await supabase
        .from('playbooks')
        .select('id, short_id')
        .eq('short_id', shortId)
        .single()
      
      if (!playbookError && playbook) {
        // Redirect to the full UUID-based URL
        return NextResponse.redirect(new URL(`/marketplace/${playbook.id}`, request.url))
      }
      
      // Check user profiles
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id, short_id')
        .eq('short_id', shortId)
        .single()
      
      if (!profileError && profile) {
        // Redirect to the full UUID-based URL
        return NextResponse.redirect(new URL(`/profile/${profile.id}`, request.url))
      }
      
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    } else if (isValidUUID(shortId)) {
      // It's already a UUID, redirect to the appropriate page
      // Check if it's a playbook
      const { data: playbook, error: playbookError } = await supabase
        .from('playbooks')
        .select('id')
        .eq('id', shortId)
        .single()
      
      if (!playbookError && playbook) {
        return NextResponse.redirect(new URL(`/marketplace/${playbook.id}`, request.url))
      }
      
      // Check if it's a user profile
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', shortId)
        .single()
      
      if (!profileError && profile) {
        return NextResponse.redirect(new URL(`/profile/${profile.id}`, request.url))
      }
      
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    } else {
      return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 })
    }
  } catch (error) {
    console.error('Error in redirect route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

