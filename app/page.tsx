import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StreamPageClient } from '@/components/stream-page-client'

export default async function HomePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  return <StreamPageClient userEmail={user.email} />
}
