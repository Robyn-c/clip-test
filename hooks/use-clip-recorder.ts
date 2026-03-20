'use client'

import { useRef, useState, useCallback, useEffect } from 'react'

interface ClipData {
  blob: Blob
  timestamp: number
  duration: number
}

const BUFFER_SECONDS = 65

export function useClipRecorder(videoRef: React.RefObject<HTMLVideoElement | null>) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const bufferRef = useRef<{ blob: Blob; timestamp: number }[]>([])
  // The very first chunk contains WebM init headers — must always be prepended to clips
  const initChunkRef = useRef<Blob | null>(null)
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

    console.log('[v0] Using mime type:', mimeType)

    const mediaRecorder = new MediaRecorder(stream, { mimeType })
    mediaRecorderRef.current = mediaRecorder
    bufferRef.current = []
    initChunkRef.current = null  // reset init chunk on new recording

    let isFirstChunk = true
    mediaRecorder.ondataavailable = (event) => {
      if (event.data.size > 0) {
        const timestamp = Date.now()

        if (isFirstChunk) {
          // Save the init segment — it contains WebM headers needed to decode any clip
          initChunkRef.current = event.data
          isFirstChunk = false
          console.log('[v0] Init chunk saved, size:', event.data.size)
          // Also add to buffer with a very old timestamp so it's never pruned by time
          bufferRef.current.push({ blob: event.data, timestamp: 0 })
          return
        }

        bufferRef.current.push({ blob: event.data, timestamp })

        // Prune old chunks but never remove index 0 (the init chunk)
        const cutoffTime = timestamp - (BUFFER_SECONDS * 1000)
        bufferRef.current = [
          bufferRef.current[0], // always keep init chunk
          ...bufferRef.current.slice(1).filter(chunk => chunk.timestamp > cutoffTime)
        ]

        if (bufferRef.current.length > 1) {
          const newDuration = Math.floor((timestamp - bufferRef.current[1].timestamp) / 1000)
          setBufferDuration(newDuration)
        }
      }
    }

    mediaRecorder.onerror = (e) => console.log('[v0] MediaRecorder error:', e)
    mediaRecorder.onstart = () => console.log('[v0] MediaRecorder started')

    mediaRecorder.start(1000)
    setIsRecording(true)
    recordingStartTimeRef.current = Date.now()

    return () => {
      isDrawingRef.current = false
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
      if (mediaRecorder.state !== 'inactive') mediaRecorder.stop()
      setIsRecording(false)
    }
  }, [videoRef, ensureAudioContext])

  const createClip = useCallback(async (totalDurationSeconds: number): Promise<ClipData | null> => {
    if (bufferRef.current.length === 0 || !initChunkRef.current) return null

    const halfDuration = totalDurationSeconds / 2
    setIsCapturing(true)

    const pressTime = Date.now()
    const preStart = pressTime - (halfDuration * 1000)

    console.log(`[v0] Clip pressed — waiting ${halfDuration}s for post-clip footage...`)
    await new Promise<void>(resolve => setTimeout(resolve, halfDuration * 1000))

    const postEnd = Date.now()

    // Get data chunks in the clip window (skip index 0, that's the init chunk)
    const dataChunks = bufferRef.current
      .slice(1)
      .filter(chunk => chunk.timestamp >= preStart && chunk.timestamp <= postEnd)
      .map(chunk => chunk.blob)

    if (dataChunks.length === 0) {
      setIsCapturing(false)
      return null
    }

    // ALWAYS prepend the init chunk so the blob is a valid decodable WebM
    const blob = new Blob([initChunkRef.current, ...dataChunks], { type: 'video/webm' })
    console.log('[v0] Clip blob size:', blob.size, 'chunks:', dataChunks.length)

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
