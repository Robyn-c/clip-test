import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/clips/[id] - Get a specific clip
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: clip, error } = await supabase
      .from('clips')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    return NextResponse.json({ clip })
  } catch (error) {
    console.error('Error fetching clip:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/clips/[id] - Delete a clip
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // First, get the clip to retrieve the filename
    const { data: clip, error: fetchError } = await supabase
      .from('clips')
      .select('filename')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    // Delete from storage
    const { error: storageError } = await supabase.storage
      .from('clips')
      .remove([clip.filename])

    if (storageError) {
      console.error('Storage delete error:', storageError)
      // Continue with database delete even if storage delete fails
    }

    // Delete from database
    const { error: dbError } = await supabase
      .from('clips')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (dbError) {
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting clip:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// PATCH /api/clips/[id] - Update clip title
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { title } = body

    if (!title || typeof title !== 'string') {
      return NextResponse.json({ error: 'Invalid title' }, { status: 400 })
    }

    const { data: clip, error } = await supabase
      .from('clips')
      .update({ title: title.trim() })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (!clip) {
      return NextResponse.json({ error: 'Clip not found' }, { status: 404 })
    }

    return NextResponse.json({ clip })
  } catch (error) {
    console.error('Error updating clip:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
