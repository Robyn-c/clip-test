'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { ClipCard } from '@/components/clip-card'
import { ClipModal } from '@/components/clip-modal'
import { createClient } from '@/lib/supabase/client'
import { X, Film, Loader2, RefreshCw } from 'lucide-react'
import type { Clip } from '@/components/clips-gallery-client'

interface ClipsPanelProps {
  isOpen: boolean
  onClose: () => void
}

export function ClipsPanel({ isOpen, onClose }: ClipsPanelProps) {
  const [clips, setClips] = useState<Clip[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [selectedSignedUrl, setSelectedSignedUrl] = useState<string | null>(null)

  const fetchClips = useCallback(async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('clips')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (!error && data) setClips(data as Clip[])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) fetchClips()
  }, [isOpen, fetchClips])

  const handleDelete = (clipId: string) => {
    setClips(prev => prev.filter(c => c.id !== clipId))
  }

  const handlePlay = (clip: Clip, signedUrl: string) => {
    setSelectedClip(clip)
    setSelectedSignedUrl(signedUrl)
  }

  return (
    <>
      <div
        className={`fixed inset-0 z-40 bg-black/50 transition-opacity duration-300 ${
          isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
      />

      <div
        className={`fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-border bg-card shadow-2xl transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <Film className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-card-foreground">Mis Clips</h2>
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
              {clips.length}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchClips}
              disabled={isLoading}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
              title="Refresh"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {isLoading && clips.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : clips.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Film className="h-12 w-12 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No se han encontrado clips.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {clips.map(clip => (
                <ClipCard
                  key={clip.id}
                  clip={clip}
                  onPlay={(signedUrl) => handlePlay(clip, signedUrl)}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedClip && selectedSignedUrl && (
        <ClipModal
          clip={selectedClip}
          signedUrl={selectedSignedUrl}
          onClose={() => { setSelectedClip(null); setSelectedSignedUrl(null) }}
        />
      )}
    </>
  )
}
