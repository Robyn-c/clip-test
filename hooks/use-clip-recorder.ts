'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface ClipData {
  blob: Blob
  timestamp: number
  duration: number
}

// How long to buffer (max clip half-length + margin)
const BUFFER_SECONDS = 65 // supports up to 60s clips (30s each side) + margin

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
  const audioSourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const rafRef = useRef<number | null>(null)
  const isDrawingRef = useRef(false)

  const ensureAudioContext = useCallback(() => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new AudioContext()
    }
    if (audioContextRef.current.state === 'suspended') {
      audioContextRef.current.resume()
    }
  }, [])

  const startBufferRecording = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      console.log('[v0] Already recording, skipping')
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

    if (!canvasRef.current) canvasRef.current = document.createElement('canvas')
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    isDrawingRef.current = true
    const drawFrame = () => {
      if (!isDrawingRef.current) return
      if (video.readyState >= 2 && !video.paused) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth || canvas.width
          canvas.height = video.videoHeight || canvas.height
        }
        try { ctx.drawImage(video, 0, 0, canvas.width, canvas.height) }
        catch (e) { console.log('[v0] Draw error:', e) }
      }
      rafRef.current = requestAnimationFrame(drawFrame)
    }
    rafRef.current = requestAnimationFrame(drawFrame)

    const stream = canvas.captureStream(30)

    try {
      ensureAudioContext()
      const audioCtx = audioContextRef.current!
      if (!audioSourceRef.current) {
        audioSourceRef.current = audioCtx.createMediaElementSource(video)
        audioDestRef.current = audioCtx.createMediaStreamDestination()
        audioSourceRef.current.connect(audioCtx.destination)
        audioSourceRef.current.connect(audioDestRef.current)
      }
      audioDestRef.current!.stream.getAudioTracks().forEach(track => stream.addTrack(track))
    } catch (e) {
      console.log('[v0] Audio setup error:', e)
      if (audioDestRef.current) {
        audioDestRef.current.stream.getAudioTracks().forEach(track => stream.addTrack(track))
      }
    }

    const mimeType =
      MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus') ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus') ? 'video/webm;codecs=vp8,opus'
      : MediaRecorder.isTypeSupported('video/webm') ? 'video/webm'
      : 'video/mp4'

    const mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mediaRecorder
    bufferRef.current = []

    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        const timestamp = Date.now()
        bufferRef.current.push({ blob: event.data, timestamp })

        const cutoffTime = timestamp - (BUFFER_SECONDS * 1000)
        bufferRef.current = bufferRef.current.filter(chunk => chunk.timestamp > cutoffTime)

        if (bufferRef.current.length > 0) {
          const newDuration = Math.floor((timestamp - bufferRef.current[0].timestamp) / 1000)
          setBufferDuration(newDuration)
        }
      }
    }

    mediaRecorder.onerror = (e) => console.log('[v0] MediaRecorder error:', e)
    mediaRecorder.start(1000)
    setIsRecording(true)
    recordingStartTimeRef.current = Date.now()
    console.log('[v0] Recording started')

    return () => {
      isDrawingRef.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
      setIsRecording(false)
    }
  }, [videoRef, ensureAudioContext])

  /**
   * Creates a clip centered on the moment the button was pressed.
   * halfDuration = seconds before AND after the press (e.g. 15 = 30s total clip)
   * After pressing, waits halfDuration seconds to collect post-clip footage.
   */
  const createClip = useCallback(async (totalDurationSeconds: number): Promise<ClipData | null> => {
    if (bufferRef.current.length === 0) return null

    const halfDuration = totalDurationSeconds / 2
    setIsCapturing(true)

    const pressTime = Date.now()
    const preStart = pressTime - (halfDuration * 1000)

    console.log(`[v0] Clip pressed — waiting ${halfDuration}s for post-clip footage...`)

    // Wait for post-clip footage
    await new Promise<void>(resolve => setTimeout(resolve, halfDuration * 1000))

    const postEnd = Date.now()

    // Grab all chunks that fall within [preStart, postEnd]
    const chunks = bufferRef.current
      .filter(chunk => chunk.timestamp >= preStart && chunk.timestamp <= postEnd)
      .map(chunk => chunk.blob)

    if (chunks.length === 0) {
      setIsCapturing(false)
      return null
    }

    const blob = new Blob(chunks, { type: 'video/webm' })
    const result: ClipData = {
      blob,
      timestamp: pressTime,
      duration: totalDurationSeconds,
    }

    setClipData(result)
    setIsCapturing(false)
    return result
  }, [])

  const clearClipData = useCallback(() => setClipData(null), [])

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
    ensureAudioContext,
    createClip,
    clearClipData,
  }
}
