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
  Circle,
  ChevronDown,
} from 'lucide-react'
import { useEffect, useState, useRef } from 'react'
import { cn } from '@/lib/utils'

const CLIP_DURATIONS = [
  { label: '30s', seconds: 30 },
  { label: '60s', seconds: 60 },
  { label: '90s', seconds: 90 },
] as const

interface StreamPlayerProps {
  streamUrl: string | null
  onClipCreated?: (blob: Blob, duration: number) => void
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
    ensureAudioContext,
    createClip,
  } = useClipRecorder(videoRef)

  const [volume, setVolume] = useState(1)
  const [showControls, setShowControls] = useState(true)
  const [clipDuration, setClipDuration] = useState(60) // default 60s (30 before + 30 after)
  const [showDurationPicker, setShowDurationPicker] = useState(false)
  // Countdown shown while waiting for post-clip footage
  const [countdown, setCountdown] = useState<number | null>(null)
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const countdownRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video || !streamUrl) return
    const handlePlaying = () => {
      if (!isRecording) startBufferRecording()
    }
    video.addEventListener('playing', handlePlaying)
    return () => video.removeEventListener('playing', handlePlaying)
  }, [streamUrl, isRecording, startBufferRecording, videoRef])

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true)
      if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) setShowControls(false)
      }, 3000)
    }
    const container = containerRef.current
    if (container) {
      container.addEventListener('mousemove', handleMouseMove)
      return () => {
        container.removeEventListener('mousemove', handleMouseMove)
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current)
      }
    }
  }, [isPlaying])

  const handleTogglePlay = () => {
    ensureAudioContext()
    togglePlay()
  }

  const handleVolumeChange = (value: number[]) => {
    const newVolume = value[0]
    setVolume(newVolume)
    if (videoRef.current) videoRef.current.volume = newVolume
  }

  const handleClip = async () => {
    if (isCapturing) return
    const half = clipDuration / 2

    // Start countdown display
    setCountdown(half)
    const tick = () => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) return null
        countdownRef.current = setTimeout(tick, 1000)
        return prev - 1
      })
    }
    countdownRef.current = setTimeout(tick, 1000)

    const clip = await createClip(clipDuration)

    if (countdownRef.current) clearTimeout(countdownRef.current)
    setCountdown(null)

    if (clip && onClipCreated) {
      onClipCreated(clip.blob, clip.duration)
    }
  }

  const toggleFullscreen = () => {
    if (containerRef.current) {
      if (document.fullscreenElement) document.exitFullscreen()
      else containerRef.current.requestFullscreen()
    }
  }

  const formatTime = (time: number) => {
    if (!isFinite(time)) return '0:00'
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const half = clipDuration / 2
  const canClip = isRecording && !isCapturing && bufferDuration >= half

  if (!streamUrl) {
    return (
      <div className="flex aspect-video w-full items-center justify-center rounded-lg border border-border bg-card">
        <p className="text-muted-foreground">Enter a stream URL to start watching</p>
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
        crossOrigin="anonymous"
        onClick={handleTogglePlay}
      />

      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <p className="text-destructive">{error}</p>
        </div>
      )}

      {/* Recording / countdown indicator */}
      <div className="absolute left-4 top-4 flex items-center gap-2">
        {isRecording && (
          <div className="flex items-center gap-2 rounded-full bg-black/60 px-3 py-1.5">
            <Circle className="h-3 w-3 animate-pulse fill-red-500 text-red-500" />
            <span className="text-xs text-foreground">
              {countdown !== null
                ? `Clipping — ${countdown}s remaining`
                : `Buffer: ${bufferDuration}s`}
            </span>
          </div>
        )}
      </div>

      {/* Controls overlay */}
      <div
        className={cn(
          'absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12 transition-opacity duration-300',
          showControls ? 'opacity-100' : 'opacity-0'
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
              onClick={handleTogglePlay}
              className="text-foreground hover:bg-foreground/10 hover:text-foreground"
            >
              {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
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
            {/* Clip button + duration selector */}
            <div className="relative flex items-center">
              {/* Main clip button */}
              <Button
                onClick={handleClip}
                disabled={!canClip}
                className="gap-2 rounded-r-none bg-accent text-accent-foreground hover:bg-accent/80"
              >
                {isCapturing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {countdown !== null ? `Clipping... ${countdown}s` : 'Creating clip...'}
                  </>
                ) : (
                  <>
                    <Scissors className="h-4 w-4" />
                    Clip · {half}s before / {half}s after
                  </>
                )}
              </Button>

              {/* Duration dropdown toggle */}
              <Button
                onClick={() => setShowDurationPicker(p => !p)}
                disabled={isCapturing}
                className="rounded-l-none border-l border-accent-foreground/20 bg-accent px-2 text-accent-foreground hover:bg-accent/80"
              >
                <ChevronDown className={cn('h-4 w-4 transition-transform', showDurationPicker && 'rotate-180')} />
              </Button>

              {/* Duration picker dropdown */}
              {showDurationPicker && (
                <div className="absolute bottom-full right-0 mb-2 overflow-hidden rounded-lg border border-border bg-card shadow-xl">
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground">
                    Clip duration
                  </div>
                  {CLIP_DURATIONS.map(({ label, seconds }) => (
                    <button
                      key={seconds}
                      onClick={() => {
                        setClipDuration(seconds)
                        setShowDurationPicker(false)
                      }}
                      className={cn(
                        'flex w-full items-center gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-muted',
                        clipDuration === seconds && 'bg-primary/10 text-primary'
                      )}
                    >
                      <span className="w-8 font-medium">{label}</span>
                      <span className="text-xs text-muted-foreground">
                        {seconds / 2}s before · {seconds / 2}s after
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

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
