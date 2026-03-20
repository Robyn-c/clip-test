'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { ClipCard } from '@/components/clip-card'
import { ClipModal } from '@/components/clip-modal'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { FolderOpen, Film } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export interface Clip {
  id: string
  user_id: string
  title: string
  description?: string
  storage_path: string
  thumbnail_path?: string
  duration_seconds?: number
  stream_url?: string
  created_at: string
  updated_at: string
}

interface ClipsGalleryClientProps {
  userEmail?: string
  initialClips: Clip[]
}

export function ClipsGalleryClient({ userEmail, initialClips }: ClipsGalleryClientProps) {
  const [clips, setClips] = useState<Clip[]>(initialClips)
  const [selectedClip, setSelectedClip] = useState<Clip | null>(null)
  const [selectedSignedUrl, setSelectedSignedUrl] = useState<string | null>(null)

  const handleDelete = (clipId: string) => {
    setClips(clips.filter(clip => clip.id !== clipId))
  }

  const handlePlay = (clip: Clip, signedUrl: string) => {
    setSelectedClip(clip)
    setSelectedSignedUrl(signedUrl)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header userEmail={userEmail} />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-card-foreground">
                <FolderOpen className="h-5 w-5 text-primary" />
                My Clips
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {clips.length} {clips.length === 1 ? 'clip' : 'clips'}
              </span>
            </div>
          </CardHeader>
          <CardContent>
            {clips.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Film className="mb-4 h-16 w-16 text-muted-foreground/50" />
                <h3 className="mb-2 text-lg font-medium text-foreground">No clips yet</h3>
                <p className="mb-6 text-muted-foreground">
                  Start watching a stream and create your first clip!
                </p>
                <Link href="/">
                  <Button className="gap-2">
                    <Film className="h-4 w-4" />
                    Go to Stream Player
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {clips.map((clip) => (
                  <ClipCard
                    key={clip.id}
                    clip={clip}
                    onPlay={(signedUrl) => handlePlay(clip, signedUrl)}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      {selectedClip && selectedSignedUrl && (
        <ClipModal
          clip={selectedClip}
          signedUrl={selectedSignedUrl}
          onClose={() => { setSelectedClip(null); setSelectedSignedUrl(null) }}
        />
      )}
    </div>
  )
}
