'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export function useSignedUrl(storagePath: string | null | undefined) {
  const [signedUrl, setSignedUrl] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (!storagePath) {
      setError('No storage path')
      return
    }

    let cancelled = false
    let refreshTimeout: ReturnType<typeof setTimeout>

    const generate = async () => {
      setIsLoading(true)
      try {
        const supabase = createClient()
        const { data, error } = await supabase.storage
          .from('clips')
          .createSignedUrl(storagePath, 3600)

        if (cancelled) return

        if (error) {
          console.error('[useSignedUrl] error for', storagePath, error)
          setError(error.message)
          return
        }

        setSignedUrl(data.signedUrl)
        setError(null)
        refreshTimeout = setTimeout(generate, 55 * 60 * 1000)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Unknown error')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    generate()

    return () => {
      cancelled = true
      clearTimeout(refreshTimeout)
    }
  }, [storagePath])

  return { signedUrl, error, isLoading }
}
