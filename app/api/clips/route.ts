import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/clips - List user's clips
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: clips, error } = await supabase
      .from('clips')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ clips })
  } catch (error) {
    console.error('Error fetching clips:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// POST /api/clips - Create a new clip
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const title = formData.get('title') as string | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (!title) {
      return NextResponse.json({ error: 'No title provided' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${user.id}/${timestamp}.webm`

    // Convert File to ArrayBuffer for upload
    const arrayBuffer = await file.arrayBuffer()
    const buffer = new Uint8Array(arrayBuffer)

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('clips')
      .upload(filename, buffer, {
        contentType: 'video/webm',
        upsert: false,
      })

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 })
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('clips')
      .getPublicUrl(filename)

    // Save metadata to database
    const { data: clip, error: dbError } = await supabase
      .from('clips')
      .insert({
        user_id: user.id,
        title: title.trim(),
        filename,
        storage_path: filename,
        url: publicUrl,
        duration: 30,
        file_size: file.size,
      })
      .select()
      .single()

    if (dbError) {
      // Clean up uploaded file on database error
      await supabase.storage.from('clips').remove([filename])
      return NextResponse.json({ error: dbError.message }, { status: 500 })
    }

    return NextResponse.json({ clip }, { status: 201 })
  } catch (error) {
    console.error('Error creating clip:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
