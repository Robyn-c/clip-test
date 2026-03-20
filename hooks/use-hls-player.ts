'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

export function useHlsPlayer(streamUrl: string | null) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const hlsRef = useRef<Hls | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return

    setIsLoading(true)
    setError(null)
    
    // Set crossOrigin to allow canvas capture for clipping
    video.crossOrigin = 'anonymous'

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      })

      hlsRef.current = hls

      hls.loadSource(streamUrl)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setIsLoading(false)
        video.play().catch((e) => {
          // Autoplay blocked, user needs to click play
        })
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              setError('Network error - check stream URL')
              hls.startLoad()
              break
            case Hls.ErrorTypes.MEDIA_ERROR:
              setError('Media error - trying to recover')
              hls.recoverMediaError()
              break
            default:
              setError('Fatal error loading stream')
              hls.destroy()
              break
          }
        }
        setIsLoading(false)
      })

      return () => {
        // Stop all loading and detach media before destroying to prevent AbortError
        hls.stopLoad()
        hls.detachMedia()
        // Use setTimeout to allow pending promises to settle before destroy
        setTimeout(() => {
          try {
            hls.destroy()
          } catch {
            // Ignore errors during cleanup
          }
        }, 0)
        hlsRef.current = null
      }
    } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
      // Safari native HLS support
      video.src = streamUrl
      video.addEventListener('loadedmetadata', () => {
        setIsLoading(false)
        video.play().catch(() => {})
      })
    } else {
      setError('HLS is not supported in this browser')
      setIsLoading(false)
    }
  }, [streamUrl])

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleTimeUpdate = () => setCurrentTime(video.currentTime)
    const handleDurationChange = () => setDuration(video.duration)
    const handlePlay = () => setIsPlaying(true)
    const handlePause = () => setIsPlaying(false)

    video.addEventListener('timeupdate', handleTimeUpdate)
    video.addEventListener('durationchange', handleDurationChange)
    video.addEventListener('play', handlePlay)
    video.addEventListener('pause', handlePause)

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate)
      video.removeEventListener('durationchange', handleDurationChange)
      video.removeEventListener('play', handlePlay)
      video.removeEventListener('pause', handlePause)
    }
  }, [])

  const togglePlay = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.paused) {
      video.play()
    } else {
      video.pause()
    }
  }, [])

  const seek = useCallback((time: number) => {
    const video = videoRef.current
    if (!video) return
    video.currentTime = time
  }, [])

  return {
    videoRef,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    togglePlay,
    seek,
  }
}
