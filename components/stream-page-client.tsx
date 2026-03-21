'use client'

import { useState } from 'react'
import { Header } from '@/components/header'
import { StreamPlayer } from '@/components/stream-player'
import { StreamInput } from '@/components/stream-input'
import { ClipPreview } from '@/components/clip-preview'
import { ClipsPanel } from '@/components/clips-panel'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Scissors, Info } from 'lucide-react'

interface StreamPageClientProps {
  userEmail?: string
}

export function StreamPageClient({ userEmail }: StreamPageClientProps) {
  const [streamUrl, setStreamUrl] = useState<string | null>(null)
  const [pendingClip, setPendingClip] = useState<{ blob: Blob; duration: number } | null>(null)
  const [clipsOpen, setClipsOpen] = useState(false)

  const handleClipCreated = (blob: Blob, duration: number) => {
    setPendingClip({ blob, duration })
  }

  const handleClipSaved = () => {
    setPendingClip(null)
  }

  const handleClipDiscard = () => {
    setPendingClip(null)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header
        userEmail={userEmail}
        onClipsClick={() => setClipsOpen(true)}
      />

      <main className="mx-auto max-w-7xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Main content - Video Player */}
          <div className="space-y-6 lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Scissors className="h-5 w-5 text-primary" />
                  Stream Player
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <StreamInput
                  onStreamLoad={setStreamUrl}
                  currentUrl={streamUrl}
                />
                <StreamPlayer
                  streamUrl={streamUrl}
                  onClipCreated={handleClipCreated}
                />
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Clip Preview */}
            {pendingClip && (
              <ClipPreview
                blob={pendingClip.blob}
                duration={pendingClip.duration}
                streamUrl={streamUrl}
                onSave={handleClipSaved}
                onDiscard={handleClipDiscard}
              />
            )}

            {/* Instructions */}
            <Card className="border-border bg-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-card-foreground">
                  <Info className="h-5 w-5 text-primary" />
                  How to use
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="list-inside list-decimal space-y-2 text-sm text-muted-foreground">
                  <li>Enter an HLS stream URL (.m3u8)</li>
                  <li>Click &quot;Load Stream&quot; to start watching</li>
                  <li>The player buffers continuously in the background</li>
                  <li>Choose a clip duration and click &quot;Clip&quot;</li>
                  <li>Preview and save your clip to your gallery</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      {/* Clips slide-over panel — stream stays mounted */}
      <ClipsPanel
        isOpen={clipsOpen}
        onClose={() => setClipsOpen(false)}
      />
    </div>
  )
}