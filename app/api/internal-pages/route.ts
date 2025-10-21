import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@clerk/nextjs/server'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Validate environment variables
if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase environment variables:', {
    hasUrl: !!supabaseUrl,
    hasServiceKey: !!supabaseServiceKey
  })
}

// Create Supabase client with service role (bypasses RLS)
const supabaseAdmin = supabaseUrl && supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey)
  : null

export async function GET(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.' }, { status: 500 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playbookId = searchParams.get('playbookId')

    if (!playbookId) {
      return NextResponse.json({ error: 'Playbook ID is required' }, { status: 400 })
    }

    // Skip database query for temporary playbooks
    if (playbookId.startsWith('temp-')) {
      return NextResponse.json({ data: [] })
    }

    // Get all internal pages for the playbook
    const { data, error } = await supabaseAdmin
      .from('internal_pages')
      .select('*')
      .eq('playbook_id', playbookId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching internal pages:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ data })
  } catch (error: any) {
    console.error('Error in GET /api/internal-pages:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.' }, { status: 500 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { playbook_id, page_name, page_title, content, permissions } = body

    if (!playbook_id || !page_name || !page_title) {
      return NextResponse.json(
        { error: 'playbook_id, page_name, and page_title are required' },
        { status: 400 }
      )
    }

    // Skip database operations for temporary playbooks
    if (playbook_id.startsWith('temp-')) {
      return NextResponse.json({ 
        error: 'Cannot create internal pages for temporary playbooks. Please save the playbook first.' 
      }, { status: 400 })
    }

    // First, create the internal page
    const { data: pageData, error: pageError } = await supabaseAdmin
      .from('internal_pages')
      .insert({
        playbook_id,
        page_name,
        page_title,
        content: content || '',
        created_by: userId
      })
      .select()
      .single()

    if (pageError) {
      console.error('Error creating internal page:', pageError)
      return NextResponse.json({ error: pageError.message }, { status: 500 })
    }

    // Then, create the permissions
    if (permissions && permissions.length > 0) {
      const permissionInserts = permissions.map((perm: any) => ({
        internal_page_id: pageData.id,
        user_id: perm.userId,
        permission_level: perm.permission,
        granted_by: userId
      }))

      const { error: permError } = await supabaseAdmin
        .from('internal_page_permissions')
        .insert(permissionInserts)

      if (permError) {
        console.error('Error creating internal page permissions:', permError)
        // Rollback the page creation
        await supabaseAdmin.from('internal_pages').delete().eq('id', pageData.id)
        return NextResponse.json({ error: permError.message }, { status: 500 })
      }
    }

    return NextResponse.json({ data: pageData })
  } catch (error: any) {
    console.error('Error in POST /api/internal-pages:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.' }, { status: 500 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, page_name, page_title, content, permissions } = body

    if (!id) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 })
    }

    const updateData: any = {}
    if (page_name !== undefined) updateData.page_name = page_name
    if (page_title !== undefined) updateData.page_title = page_title
    if (content !== undefined) updateData.content = content

    const { data: pageData, error: pageError } = await supabaseAdmin
      .from('internal_pages')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (pageError) {
      console.error('Error updating internal page:', pageError)
      return NextResponse.json({ error: pageError.message }, { status: 500 })
    }

    // Update permissions if provided
    if (permissions) {
      // First, delete existing permissions
      const { error: deleteError } = await supabaseAdmin
        .from('internal_page_permissions')
        .delete()
        .eq('internal_page_id', id)

      if (deleteError) {
        console.error('Error deleting old permissions:', deleteError)
        return NextResponse.json({ error: deleteError.message }, { status: 500 })
      }

      // Then, insert new permissions
      if (permissions.length > 0) {
        const permissionInserts = permissions.map((perm: any) => ({
          internal_page_id: id,
          user_id: perm.userId,
          permission_level: perm.permission,
          granted_by: userId
        }))

        const { error: permError } = await supabaseAdmin
          .from('internal_page_permissions')
          .insert(permissionInserts)

        if (permError) {
          console.error('Error creating new permissions:', permError)
          return NextResponse.json({ error: permError.message }, { status: 500 })
        }
      }
    }

    return NextResponse.json({ data: pageData })
  } catch (error: any) {
    console.error('Error in PUT /api/internal-pages:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: 'Database not configured. Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.' }, { status: 500 })
    }

    const { userId } = await auth()
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 })
    }

    const { error } = await supabaseAdmin.from('internal_pages').delete().eq('id', id)

    if (error) {
      console.error('Error deleting internal page:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error in DELETE /api/internal-pages:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

