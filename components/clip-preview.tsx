'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Save, X, Loader2, Film } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface ClipPreviewProps {
  blob: Blob
  duration?: number
  streamUrl?: string | null
  onSave: () => void
  onDiscard: () => void
}

export function ClipPreview({ blob, duration, streamUrl, onSave, onDiscard }: ClipPreviewProps) {
  const [title, setTitle] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    const url = URL.createObjectURL(blob)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [blob])

const handleSave = async () => {
  if (!title.trim()) {
    setError('Please enter a title')
    return
  }

  setIsSaving(true)
  setError(null)

  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Not logged in')

    const fileName = `${user.id}/${Date.now()}.webm`

    const { error: uploadError } = await supabase.storage
      .from('clips')
      .upload(fileName, blob)

    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('clips')
      .getPublicUrl(fileName)

    const publicUrl = publicUrlData.publicUrl

    const { error: dbError } = await supabase.from('clips').insert({
      user_id: user.id,
      title,
      storage_path: fileName,
      public_url: publicUrl,
      stream_url: streamUrl,
      duration_seconds: duration
    })

    if (dbError) throw dbError

    onSave()
  } catch (err: any) {
    setError(err.message)
  } finally {
    setIsSaving(false)
  }
}

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <Film className="h-5 w-5 text-accent" />
          New Clip
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewUrl && (
          <div className="overflow-hidden rounded-lg border border-border">
            <video src={previewUrl} controls className="w-full" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="clip-title">Clip Title</Label>
          <Input
            id="clip-title"
            placeholder="Enter a title for your clip"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="bg-input border-border"
          />
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={isSaving} className="flex-1 gap-2">
            {isSaving ? (
              <><Loader2 className="h-4 w-4 animate-spin" />Saving...</>
            ) : (
              <><Save className="h-4 w-4" />Save Clip</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
            className="gap-2 border-border"
          >
            <X className="h-4 w-4" />
            Discard
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          File size: {(blob.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </CardContent>
    </Card>
  )
}