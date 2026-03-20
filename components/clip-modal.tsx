'use client'

import { useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { X, Download, Clock, Calendar } from 'lucide-react'
import type { Clip } from '@/components/clips-gallery-client'

interface ClipModalProps {
  clip: Clip
  signedUrl: string
  onClose: () => void
}

export function ClipModal({ clip, signedUrl, onClose }: ClipModalProps) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = ''
    }
  }, [handleKeyDown])

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose()
  }

  const handleDownload = () => {
    const a = document.createElement('a')
    a.href = signedUrl
    a.target = "_blank"
    a.download = `${clip.title}.webm`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-4xl overflow-hidden rounded-lg border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-4">
          <div>
            <h2 className="text-lg font-semibold text-card-foreground">{clip.title}</h2>
            {clip.description && (
              <p className="text-sm text-muted-foreground">{clip.description}</p>
            )}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-muted-foreground hover:bg-secondary hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="aspect-video bg-black">
          <video
            src={signedUrl}
            controls
            autoPlay
            className="h-full w-full"
          />
        </div>

        <div className="flex items-center justify-between border-t border-border p-4">
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            {clip.duration_seconds && (
              <span className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                {formatDuration(clip.duration_seconds)}
              </span>
            )}
            <span className="flex items-center gap-1.5">
              <Calendar className="h-4 w-4" />
              {formatDate(clip.created_at)}
            </span>
          </div>

          <Button onClick={handleDownload} className="gap-2">
            <Download className="h-4 w-4" />
            Descargar
          </Button>
        </div>
      </div>
    </div>
  )
}
