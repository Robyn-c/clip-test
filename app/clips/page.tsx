import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ClipsGalleryClient } from '@/components/clips-gallery-client'

export default async function ClipsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Fetch user's clips
  const { data: clips, error } = await supabase
    .from('clips')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching clips:', error)
  }

  return <ClipsGalleryClient userEmail={user.email} initialClips={clips || []} />
}
