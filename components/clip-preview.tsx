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
  streamUrl?: string | null
  onSave: () => void
  onDiscard: () => void
}

export function ClipPreview({ blob, streamUrl, onSave, onDiscard }: ClipPreviewProps) {
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
      setError('Please enter a title for your clip')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) throw new Error('You must be logged in to save clips')

      const timestamp = Date.now()
      const storage_path = `${user.id}/${timestamp}.webm`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('clips')
        .upload(storage_path, blob, {
          contentType: 'video/webm',
          upsert: false,
        })

      if (uploadError) throw new Error(uploadError.message)

      // Insert metadata using the real schema columns
      const { error: dbError } = await supabase
        .from('clips')
        .insert({
          user_id: user.id,
          title: title.trim(),
          storage_path,
          stream_url: streamUrl ?? null,
          duration_seconds: 60,
        })

      if (dbError) {
        await supabase.storage.from('clips').remove([storage_path])
        throw new Error(dbError.message)
      }

      onSave()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save clip')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-card-foreground">
          <Film className="h-5 w-5 text-accent" />
          Nuevo Clip
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {previewUrl && (
          <div className="overflow-hidden rounded-lg border border-border">
            <video src={previewUrl} controls className="w-full" />
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="clip-title">Título del Clip</Label>
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
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                Guardar
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={onDiscard}
            disabled={isSaving}
            className="gap-2 border-border"
          >
            <X className="h-4 w-4" />
            Descartar
          </Button>
        </div>

        <p className="text-xs text-muted-foreground">
          Tamaño: {(blob.size / 1024 / 1024).toFixed(2)} MB
        </p>
      </CardContent>
    </Card>
  )
}
