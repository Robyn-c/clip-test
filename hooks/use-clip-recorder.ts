"use client";

import { useRef, useState, useCallback, useEffect } from "react";

interface ClipRange {
  start: number;
  end: number;
  duration: number;
}

interface ClipResult {
  blob: Blob;
  range: ClipRange;
}

interface TimestampedChunk {
  blob: Blob;
  timestamp: number;
}

const MAX_BUFFER_DURATION = 120; // Keep 2 minutes of buffer

// Extended HTMLVideoElement type to include browser-specific captureStream methods
interface ExtendedHTMLVideoElement extends HTMLVideoElement {
  captureStream?: (frameRate?: number) => MediaStream;
  mozCaptureStream?: (frameRate?: number) => MediaStream;
}

// Helper to get the capture stream from a video element
function getCaptureStream(video: ExtendedHTMLVideoElement): MediaStream | null {
  if (typeof video.captureStream === "function") {
    return video.captureStream();
  }
  if (typeof video.mozCaptureStream === "function") {
    return video.mozCaptureStream();
  }
  return null;
}

export function useClipRecorder(
  videoRef: React.RefObject<HTMLVideoElement | null>,
  streamUrl: string
) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const ringBufferRef = useRef<TimestampedChunk[]>([]);
  const isRecordingRef = useRef(false);

  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [clipResult, setClipResult] = useState<ClipResult | null>(null);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferDuration, setBufferDuration] = useState(0);
  const [isSupported, setIsSupported] = useState(true);

  // Start continuous background recording when stream is active
  useEffect(() => {
    const video = videoRef.current as ExtendedHTMLVideoElement | null;
    if (!video || !streamUrl) {
      // Clean up if no video or stream
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
      ringBufferRef.current = [];
      setBufferDuration(0);
      setIsBuffering(false);
      return;
    }

    const startRecording = () => {
      if (isRecordingRef.current) {
        console.log("[v0] Already recording, skipping");
        return;
      }
      
      console.log("[v0] Starting background recording...");
      console.log("[v0] Video state - paused:", video.paused, "readyState:", video.readyState);
      
      try {
        const stream = getCaptureStream(video);
        
        if (!stream) {
          console.warn("[v0] captureStream not supported in this browser");
          setIsSupported(false);
          return;
        }
        
        console.log("[v0] Got capture stream with", stream.getTracks().length, "tracks");
        
        // Check for supported mime types
        let mimeType = "video/webm;codecs=vp8,opus";
        if (!MediaRecorder.isTypeSupported(mimeType)) {
          mimeType = "video/webm;codecs=vp9,opus";
          if (!MediaRecorder.isTypeSupported(mimeType)) {
            mimeType = "video/webm";
          }
        }

        const recorder = new MediaRecorder(stream, { mimeType });
        mediaRecorderRef.current = recorder;

        recorder.ondataavailable = (e) => {
          if (e.data.size > 0) {
            const now = Date.now();
            ringBufferRef.current.push({ blob: e.data, timestamp: now });

            // Prune old chunks beyond MAX_BUFFER_DURATION
            const cutoff = now - MAX_BUFFER_DURATION * 1000;
            ringBufferRef.current = ringBufferRef.current.filter(
              (chunk) => chunk.timestamp >= cutoff
            );

            // Calculate approximate buffer duration
            if (ringBufferRef.current.length > 0) {
              const oldest = ringBufferRef.current[0].timestamp;
              const newest = ringBufferRef.current[ringBufferRef.current.length - 1].timestamp;
              setBufferDuration(Math.floor((newest - oldest) / 1000));
            }
          }
        };

        recorder.onerror = () => {
          isRecordingRef.current = false;
          setIsBuffering(false);
        };

        // Record in 1-second chunks for granularity
        recorder.start(1000);
        isRecordingRef.current = true;
        setIsBuffering(true);
      } catch (err) {
        console.error("[v0] Failed to start background recording:", err);
        isRecordingRef.current = false;
        setIsBuffering(false);
      }
    };

    // Start recording when video starts playing
    const handlePlay = () => {
      // Small delay to ensure video is actually playing
      setTimeout(startRecording, 500);
    };

    const handlePause = () => {
      // Keep recording even when paused - user might unpause
    };

    // If video is already playing, start recording
    if (!video.paused && video.readyState >= 2) {
      setTimeout(startRecording, 500);
    }

    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    return () => {
      video.removeEventListener("play", handlePlay);
      video.removeEventListener("pause", handlePause);

      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        try {
          mediaRecorderRef.current.stop();
        } catch {
          // Ignore errors during cleanup
        }
      }
      isRecordingRef.current = false;
      ringBufferRef.current = [];
      setBufferDuration(0);
      setIsBuffering(false);
    };
  }, [videoRef, streamUrl]);

  const recordClip = useCallback(async (duration: number): Promise<ClipResult | null> => {
    const video = videoRef.current;
    if (!video) return null;

    if (ringBufferRef.current.length === 0) {
      console.error("[v0] No buffered data available");
      return null;
    }

    setIsRecordingClip(true);

    try {
      const now = Date.now();
      const cutoffTime = now - duration * 1000;

      // Get chunks from the last N seconds
      const relevantChunks = ringBufferRef.current.filter(
        (chunk) => chunk.timestamp >= cutoffTime
      );

      if (relevantChunks.length === 0) {
        console.error("[v0] No chunks available for requested duration");
        setIsRecordingClip(false);
        return null;
      }

      // Combine all relevant chunks into a single blob
      const blobs = relevantChunks.map((chunk) => chunk.blob);
      const combinedBlob = new Blob(blobs, { type: "video/webm" });

      // Calculate actual duration from chunks
      const actualStart = relevantChunks[0].timestamp;
      const actualEnd = relevantChunks[relevantChunks.length - 1].timestamp;
      const actualDuration = (actualEnd - actualStart) / 1000;

      const range: ClipRange = {
        start: 0,
        end: actualDuration,
        duration: actualDuration,
      };

      const result: ClipResult = { blob: combinedBlob, range };
      setClipResult(result);
      setIsRecordingClip(false);

      return result;
    } catch (err) {
      console.error("[v0] Error creating clip:", err);
      setIsRecordingClip(false);
      return null;
    }
  }, [videoRef]);

  return {
    isRecordingClip,
    clipResult,
    recordClip,
    isBuffering,
    bufferDuration,
    isSupported,
  };
}
