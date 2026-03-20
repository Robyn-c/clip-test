'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Link2, Play } from 'lucide-react'

interface StreamInputProps {
  onStreamLoad: (url: string) => void
  currentUrl: string | null
}

export function StreamInput({ onStreamLoad, currentUrl }: StreamInputProps) {
  const [url, setUrl] = useState(currentUrl || '')
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!url.trim()) {
      setError('Please enter a stream URL')
      return
    }

    // Basic validation for HLS streams
    if (!url.includes('.m3u8') && !url.includes('m3u8')) {
      setError('Please enter a valid HLS stream URL (.m3u8)')
      return
    }

    onStreamLoad(url.trim())
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="stream-url" className="text-foreground">Stream URL</Label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Link2 className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="stream-url"
              type="url"
              placeholder="https://ejemplo.cl/stream.m3u8"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="bg-input border-border pl-10"
            />
          </div>
          <Button type="submit" className="gap-2">
            <Play className="h-4 w-4" />
            Cargar Stream
          </Button>
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
      </div>

    </form>
  )
}
