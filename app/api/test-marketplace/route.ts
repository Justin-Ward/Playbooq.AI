import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(request: NextRequest) {
  try {
    // Test basic playbooks query
    const { data: playbooks, error: playbooksError } = await supabase
      .from('playbooks')
      .select('id, title, is_marketplace, owner_id')
      .limit(5)

    if (playbooksError) {
      console.error('Playbooks error:', playbooksError)
      return NextResponse.json({ 
        error: 'Playbooks query failed', 
        details: playbooksError.message 
      }, { status: 500 })
    }

    // Test user_profiles query
    const { data: profiles, error: profilesError } = await supabase
      .from('user_profiles')
      .select('id, display_name')
      .limit(5)

    if (profilesError) {
      console.error('Profiles error:', profilesError)
      return NextResponse.json({ 
        error: 'Profiles query failed', 
        details: profilesError.message 
      }, { status: 500 })
    }

    // Test marketplace columns exist
    const { data: marketplaceTest, error: marketplaceError } = await supabase
      .from('playbooks')
      .select('is_marketplace, price, total_purchases, average_rating')
      .limit(1)

    if (marketplaceError) {
      console.error('Marketplace columns error:', marketplaceError)
      return NextResponse.json({ 
        error: 'Marketplace columns missing', 
        details: marketplaceError.message 
      }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      data: {
        playbooks: playbooks?.length || 0,
        profiles: profiles?.length || 0,
        marketplaceColumns: marketplaceTest?.length > 0,
        samplePlaybook: playbooks?.[0],
        sampleProfile: profiles?.[0]
      }
    })

  } catch (error) {
    console.error('Test marketplace error:', error)
    return NextResponse.json({ 
      error: 'Test failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
