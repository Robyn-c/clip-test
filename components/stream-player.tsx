'use client'

import { useHlsPlayer } from '@/hooks/use-hls-player'
import { useClipRecorder } from '@/hooks/use-clip-recorder'
import { Button } from '@/components/ui/button'
import { Slider } from '@/components/ui/slider'
import {
  Play,
  Pause,
  Scissors,
  Loader2,
  Volume2,
  Maximize,
  Circle
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

interface StreamPlayerProps {
  streamUrl: string | null
  onClipCreated?: (blob: Blob) => void
}

export function StreamPlayer({ streamUrl, onClipCreated }: StreamPlayerProps) {
  const {
    videoRef,
    isPlaying,
    isLoading,
    error,
    currentTime,
    duration,
    togglePlay,
  } = useHlsPlayer(streamUrl)

  const {
    isRecording,
    isCapturing,
    bufferDuration,
    startBufferRecording,
    createQuickClip,
  } = useClipRecorder(videoRef)

  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Start buffer recording when stream starts playing
  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return

    const handlePlaying = () => {
      if (!isRecording) {
        startBufferRecording()
      }
    }

    video.addEventListener('playing', handlePlaying)
    return () => video.removeEventListener('playing', handlePlaying)
  }, [streamUrl, isRecording, startBufferRecording, videoRef])

  // Auto-hide controls
  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current)
      }
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false)
        }
      }, 3000)
    }

    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
      return () => {
        container.removeEventListener('mousemove', handleMouseMove)
        if (controlsTimeoutRef.current) {
          clearTimeout(controlsTimeoutRef.current)
        }
      }
    }
  }, [isPlaying])

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (videoRef.current) {
      videoRef.current.volume = newVolume
    }
  }

  const handleClip = async () => {
    const clip = await createQuickClip()
    if (clip && onClipCreated) {
      onClipCreated(clip.blob)
    }
  }

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen()
      } else {
        containerRef.current.requestFullscreen()
      }
    }
  }

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  if (!streamUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-muted-foreground">Ingrese una url para comenzar</p>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-black"
      onMouseEnter={() => setShowControls(true)}
    >
      <video
        ref={videoRef}
        className="h-full w-full"
        playsInline
        onClick={togglePlay}
      />

      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Recording indicator */}
      {isRecording && (
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5">
          <Circle className="h-3 w-3 animate-pulse fill-red-500 text-red-500" />
          <span className="text-xs text-foreground">
            Buffer: {bufferDuration}s
          </span>
        </div>
      )}

      {/* Controls overlay */}
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300",
          showControls ? "opacity-100" : "opacity-0"
        )}
      >
        {/* Progress bar */}
        <div className="mb-4 flex items-center gap-2 text-sm text-foreground">
          <span>{formatTime(currentTime)}</span>
          <div className="h-1 flex-1 rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>
          <span>{formatTime(duration)}</span>
        </div>

        {/* Control buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={togglePlay}
              className="text-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>

            <div className="flex items-center gap-2">
              <Volume2 className="h-4 w-4 text-foreground" />
              <Slider
                value={[volume]}
                onValueChange={handleVolumeChange}
                max={1}
                step={0.01}
                className="w-24"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={handleClip}
              disabled={!isRecording || isCapturing || bufferDuration < 5}
              className="gap-2 bg-accent text-accent-foreground hover:bg-accent/80"
            >
              {isCapturing ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando clip...
                </>
              ) : (
                <>
                  <Scissors className="h-4 w-4" />
                  Clip últimos 30s
                </>
              )}
            </Button>

            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              <Maximize className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
