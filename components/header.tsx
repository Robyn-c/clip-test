'use client'

import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Film, LogOut, FolderOpen } from 'lucide-react'
import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'

interface HeaderProps {
  userEmail?: string
  /** 
   * If provided, clicking "My Clips" calls this instead of navigating.
   * Used on the stream page to open the clips panel without unmounting the player.
   */
  onClipsClick?: () => void
}

export function Header({ userEmail, onClipsClick }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()

  const handleSignOut = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const clipsButton = (
    <Button
      variant="ghost"
      className="gap-2 text-foreground hover:bg-secondary hover:text-foreground"
      onClick={onClipsClick}
    >
      <FolderOpen className="h-4 w-4" />
      Mis Clips
    </Button>
  )

  return (
    <header className="border-b border-border bg-card">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-end px-4">
        <nav className="flex items-center gap-4">
          {/* On the stream page, open the panel. Anywhere else, navigate to /clips */}
          {onClipsClick ? (
            clipsButton
          ) : (
            <Link href="/clips">
              {clipsButton}
            </Link>
          )}

          <div className="flex items-center gap-3">
            {userEmail && (
              <span className="text-sm text-muted-foreground">{userEmail}</span>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSignOut}
              className="text-muted-foreground hover:bg-secondary hover:text-foreground"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </nav>
      </div>
    </header>
  )
}
