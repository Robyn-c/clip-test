"use client";

import { useRef, useState, useCallback } from "react";

interface ClipRange {
  start: number;
  end: number;
  duration: number;
}

interface ClipResult {
  blob: Blob;
  range: ClipRange;
}

export function useClipRecorder(
videoRef: React.RefObject<HTMLVideoElement | null>, p0: string,
) {
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [isRecordingClip, setIsRecordingClip] = useState(false);
  const [clipResult, setClipResult] = useState<ClipResult | null>(null);

  const getClipRange = useCallback((duration: number): ClipRange | null => {
    const video = videoRef.current;
    if (!video) return null;

    const end = video.currentTime;
    const start = Math.max(0, end - duration);

    return { start, end, duration };
  }, [videoRef]);

  const recordClip = useCallback(async (duration: number) => {
    const video = videoRef.current;
    if (!video) return null;

    const range = getClipRange(duration);
    if (!range) return null;

    setIsRecordingClip(true);
    chunksRef.current = [];

    const stream = video.captureStream();

    const recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=vp8,opus",
    });

    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        chunksRef.current.push(e.data);
      }
    };

    recorder.start();

    const originalTime = video.currentTime;

    // 🔴 IMPORTANT: wait for seek to stabilize
    video.currentTime = range.start;

    await new Promise((res) => {
      const handler = () => {
        video.removeEventListener("seeked", handler);
        res(null);
      };
      video.addEventListener("seeked", handler);
    });

    await video.play();

    await new Promise((res) =>
      setTimeout(res, range.duration * 1000),
    );

    recorder.stop();

    await new Promise((res) => {
      recorder.onstop = res;
    });

    const blob = new Blob(chunksRef.current, {
      type: "video/webm",
    });

    // return to live edge
    video.currentTime = originalTime;
    video.play().catch(() => {});

    const result: ClipResult = { blob, range };
    setClipResult(result);
    setIsRecordingClip(false);

    return result;
  }, [videoRef, getClipRange]);

  return {
    isRecordingClip,
    clipResult,
    recordClip,
  };
}