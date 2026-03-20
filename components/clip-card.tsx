'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Play, Trash2, Loader2, AlertCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useSignedUrl } from '@/hooks/use-signed-url'
import type { Clip } from '@/components/clips-gallery-client'

interface ClipCardProps {
  clip: Clip
  onPlay: (signedUrl: string) => void
  onDelete: (clipId: string) => void
}

export function ClipCard({ clip, onPlay, onDelete }: ClipCardProps) {
  const [isDeleting, setIsDeleting] = useState(false)
  const { signedUrl, error: urlError, isLoading } = useSignedUrl(clip.storage_path)

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this clip?')) return
    setIsDeleting(true)
    try {
      const supabase = createClient()

      if (clip.storage_path) {
        const { error: storageError } = await supabase.storage
          .from('clips')
          .remove([clip.storage_path])
        if (storageError) console.error('Storage delete error:', storageError)
      }

      const { error: dbError } = await supabase
        .from('clips')
        .delete()
        .eq('id', clip.id)
      if (dbError) throw new Error(dbError.message)

      onDelete(clip.id)
    } catch (error) {
      console.error('Delete error:', error)
      alert('Failed to delete clip')
    } finally {
      setIsDeleting(false)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return null
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  const renderThumbnail = () => {
    if (isLoading) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Loading...</span>
        </div>
      )
    }
    if (urlError || !signedUrl) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
          <AlertCircle className="h-6 w-6 text-destructive" />
          <span className="text-xs text-muted-foreground">{urlError ?? 'Could not load video'}</span>
        </div>
      )
    }
    return (
      <video
        src={signedUrl}
        className="h-full w-full object-cover"
        preload="metadata"
        crossOrigin="anonymous"
        muted
      />
    )
  }

  return (
    <Card className="group overflow-hidden border-border bg-card transition-all hover:border-primary/50">
      <div
        className="relative aspect-video cursor-pointer bg-black"
        onClick={() => signedUrl && onPlay(signedUrl)}
      >
        {renderThumbnail()}
        {signedUrl && !isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground">
              <Play className="h-6 w-6" />
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <h3 className="mb-1 line-clamp-1 font-medium text-card-foreground" title={clip.title}>
          {clip.title}
        </h3>

        {clip.description && (
          <p className="mb-2 line-clamp-1 text-xs text-muted-foreground">{clip.description}</p>
        )}

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>{formatDate(clip.created_at)}</span>
            {clip.duration_seconds && (
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatDuration(clip.duration_seconds)}
              </span>
            )}
          </div>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            disabled={isDeleting}
            className="h-8 w-8 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </Card>
  )
}
