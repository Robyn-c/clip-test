'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface ClipData {
  blob: Blob
  timestamp: number
  duration: number
}

export function useClipRecorder(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const bufferRef = useRef<{ blob: Blob; timestamp: number }[]>([])
  const recordingStartTimeRef = useRef<number>(0)
  const [isRecording, setIsRecording] = useState(false)
  const [isCapturing, setIsCapturing] = useState(false)
  const [clipData, setClipData] = useState<ClipData | null>(null)
  const [bufferDuration, setBufferDuration] = useState(0)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const audioDestRef = useRef<MediaStreamAudioDestinationNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const isDrawingRef = useRef(false)

  const startBufferRecording = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      return
    }

    if (video.readyState < 2) {
      const handleLoadedData = () => {
        video.removeEventListener('loadeddata', handleLoadedData)
        startBufferRecording()
      }
      video.addEventListener('loadeddata', handleLoadedData)
      return
    }

    // --- Video: canvas capture ---
    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Use requestAnimationFrame instead of setInterval —
    // browser throttles it when tab is hidden, saving CPU
    isDrawingRef.current = true
    const drawFrame = () => {
      if (!isDrawingRef.current) return
      if (video.readyState >= 2 && !video.paused) {
        // Only resize canvas if video dimensions changed
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || canvas.width
          canvas.height = video.videoHeight || canvas.height
        }
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        } catch (e) {
        }
      }
      rafRef.current = requestAnimationFrame(drawFrame)
    }
    rafRef.current = requestAnimationFrame(drawFrame)

    const stream = canvas.captureStream(30)

    // --- Audio: Web Audio API ---
    try {
      if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
        audioContextRef.current = new AudioContext()
      }
      const audioCtx = audioContextRef.current
      if (audioCtx.state === 'suspended') audioCtx.resume()

      const source = audioCtx.createMediaElementSource(video)
      audioDestRef.current = audioCtx.createMediaStreamDestination()
      source.connect(audioCtx.destination)
      source.connect(audioDestRef.current)

      audioDestRef.current.stream.getAudioTracks().forEach(track => {
        stream.addTrack(track)
      })
    } catch (e) {
      if (audioDestRef.current) {
        audioDestRef.current.stream.getAudioTracks().forEach(track => stream.addTrack(track))
      }
    }

    const mimeType =
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
        ? 'video/webm;codecs=vp9,opus'
        : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')
          ? 'video/webm;codecs=vp8,opus'
          : MediaRecorder.isTypeSupported('video/webm')
            ? 'video/webm'
            : 'video/mp4'


    const mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mediaRecorder
    bufferRef.current = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        const timestamp = Date.now()
        bufferRef.current.push({ blob: event.data, timestamp })

        // Keep only last 35 seconds
        const cutoffTime = timestamp - 35000
        bufferRef.current = bufferRef.current.filter(chunk => chunk.timestamp > cutoffTime)

        if (bufferRef.current.length > 0) {
          const newDuration = Math.floor((timestamp - bufferRef.current[0].timestamp) / 1000)
          setBufferDuration(newDuration)
        }
      }
    }

    mediaRecorder.onerror = (event) => console.log('MediaRecorder error:', event)
    mediaRecorder.onstart = () => console.log('MediaRecorder started')

    mediaRecorder.start(1000)
    setIsRecording(true)
    recordingStartTimeRef.current = Date.now()

    return () => {
      isDrawingRef.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
      setIsRecording(false)
    }
  }, [videoRef])

  const createQuickClip = useCallback(async (): Promise<ClipData | null> => {
    if (bufferRef.current.length === 0) return null

    setIsCapturing(true)

    const now = Date.now()
    const thirtySecondsAgo = now - 30000
    const clipChunks = bufferRef.current
      .filter(chunk => chunk.timestamp >= thirtySecondsAgo)
      .map(chunk => chunk.blob)

    if (clipChunks.length === 0) {
      setIsCapturing(false)
      return null
    }

    const blob = new Blob(clipChunks, { type: 'video/webm' })
    const clipResult: ClipData = {
      blob,
      timestamp: now,
      duration: Math.min(30, bufferDuration),
    }

    setClipData(clipResult)
    setIsCapturing(false)
    return clipResult
  }, [bufferDuration])

  const createClip = useCallback(async (): Promise<ClipData | null> => {
    return createQuickClip()
  }, [createQuickClip])

  const clearClipData = useCallback(() => {
    setClipData(null)
  }, [])

  useEffect(() => {
    return () => {
      isDrawingRef.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    }
  }, [])

  return {
    isRecording,
    isCapturing,
    clipData,
    bufferDuration,
    startBufferRecording,
    createClip,
    createQuickClip,
    clearClipData,
  }
}