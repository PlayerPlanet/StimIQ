import { useEffect, useRef, useState } from 'react';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { Card } from '../../components/common/Card';
import type { HandTrackingPoint } from '../../lib/types';

const HAND_CONNECTIONS: Array<[number, number]> = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [0, 9], [9, 10], [10, 11], [11, 12],
  [0, 13], [13, 14], [14, 15], [15, 16],
  [0, 17], [17, 18], [18, 19], [19, 20],
  [5, 9], [9, 13], [13, 17],
];

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

export function ClinicianHandTrackingDebug() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingState, setTrackingState] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [landmarks, setLandmarks] = useState<HandTrackingPoint[]>([]);
  const [handednessLabel, setHandednessLabel] = useState<string>('N/A');
  const [handednessScore, setHandednessScore] = useState<number | null>(null);
  const [fps, setFps] = useState<number>(0);
  const frameCountRef = useRef<number>(0);
  const fpsStartRef = useRef<number>(0);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      handLandmarkerRef.current?.close();
      streamRef.current = null;
    };
  }, []);

  const initLandmarker = async () => {
    if (handLandmarkerRef.current) {
      return handLandmarkerRef.current;
    }

    setTrackingState('loading');
    setTrackingError(null);
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );
      const handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
        },
        runningMode: 'VIDEO',
        numHands: 1,
      });
      handLandmarkerRef.current = handLandmarker;
      setTrackingState('active');
      return handLandmarker;
    } catch (err) {
      setTrackingState('error');
      setTrackingError(err instanceof Error ? err.message : 'Failed to initialize hand tracking.');
      throw err;
    }
  };

  const startTrackingLoop = () => {
    fpsStartRef.current = performance.now();
    frameCountRef.current = 0;

    const detectFrame = () => {
      const video = videoRef.current;
      const handLandmarker = handLandmarkerRef.current;
      if (!video || !handLandmarker || !streamRef.current) {
        return;
      }

      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const now = performance.now();
        const detectResult = handLandmarker.detectForVideo(video, now);
        const firstHand = detectResult.landmarks?.[0];
        const handedness = detectResult.handednesses?.[0]?.[0];

        if (firstHand) {
          setLandmarks(
            firstHand.map((point) => ({
              x: clamp01(point.x),
              y: clamp01(point.y),
            }))
          );
        } else {
          setLandmarks([]);
        }

        if (handedness) {
          setHandednessLabel(handedness.categoryName ?? 'N/A');
          setHandednessScore(handedness.score ?? null);
        } else {
          setHandednessLabel('N/A');
          setHandednessScore(null);
        }

        frameCountRef.current += 1;
        const elapsed = now - fpsStartRef.current;
        if (elapsed >= 1000) {
          setFps((frameCountRef.current * 1000) / elapsed);
          fpsStartRef.current = now;
          frameCountRef.current = 0;
        }
      }

      animationFrameRef.current = requestAnimationFrame(detectFrame);
    };

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    animationFrameRef.current = requestAnimationFrame(detectFrame);
  };

  const startCamera = async () => {
    setCameraState('starting');
    setCameraError(null);
    setTrackingError(null);
    try {
      await initLandmarker();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraState('active');
      setTrackingState('active');
      lastVideoTimeRef.current = -1;
      startTrackingLoop();
    } catch (err) {
      setCameraState('error');
      setCameraError(err instanceof Error ? err.message : 'Failed to access webcam.');
    }
  };

  const stopCamera = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
    setTrackingState('idle');
    setLandmarks([]);
    setHandednessLabel('N/A');
    setHandednessScore(null);
    setFps(0);
  };

  return (
    <ClinicianLayout>
      <div className="px-4 py-3 space-y-3">
        <div className="border-b border-border-subtle pb-2">
          <h1 className="text-xl font-bold text-text-main">Hand Tracking Debug View</h1>
          <p className="text-xs text-text-muted mt-1">
            Live full-hand pose from MediaPipe for clinician-side debugging.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-3">
          <Card className="p-3 space-y-3">
            <div className="rounded-sm border border-border-subtle bg-surface-alt p-3 relative">
              <video
                ref={videoRef}
                className="w-full aspect-video rounded-sm bg-black object-cover"
                style={{ transform: 'scaleX(-1)' }}
                autoPlay
                muted
                playsInline
              />
              <svg
                className="absolute inset-3 w-[calc(100%-1.5rem)] h-[calc(100%-1.5rem)] pointer-events-none"
                viewBox="0 0 100 100"
                preserveAspectRatio="none"
                style={{ transform: 'scaleX(-1)' }}
              >
                {HAND_CONNECTIONS.map(([from, to]) => {
                  const a = landmarks[from];
                  const b = landmarks[to];
                  if (!a || !b) {
                    return null;
                  }
                  return (
                    <line
                      key={`${from}-${to}`}
                      x1={a.x * 100}
                      y1={a.y * 100}
                      x2={b.x * 100}
                      y2={b.y * 100}
                      stroke="#22d3ee"
                      strokeWidth="0.6"
                    />
                  );
                })}
                {landmarks.map((point, idx) => (
                  <circle
                    key={idx}
                    cx={point.x * 100}
                    cy={point.y * 100}
                    r="0.9"
                    fill={idx === 0 ? '#f59e0b' : '#e5e7eb'}
                    stroke="#111827"
                    strokeWidth="0.2"
                  />
                ))}
              </svg>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={cameraState === 'starting' || cameraState === 'active'}
                className="px-4 py-2 bg-brand-blue text-white rounded-sm font-semibold text-sm hover:bg-brand-navy disabled:opacity-60"
              >
                {cameraState === 'starting' ? 'Starting camera...' : 'Start camera'}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                disabled={cameraState !== 'active'}
                className="px-4 py-2 bg-surface-alt text-text-main border border-border-subtle rounded-sm font-semibold text-sm hover:bg-surface disabled:opacity-60"
              >
                Stop camera
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="rounded-sm border border-border-subtle bg-surface-alt p-2">
                <p className="text-text-muted">Camera</p>
                <p className="font-semibold text-text-main">{cameraState}</p>
              </div>
              <div className="rounded-sm border border-border-subtle bg-surface-alt p-2">
                <p className="text-text-muted">Tracking</p>
                <p className="font-semibold text-text-main">{trackingState}</p>
              </div>
              <div className="rounded-sm border border-border-subtle bg-surface-alt p-2">
                <p className="text-text-muted">Handedness</p>
                <p className="font-semibold text-text-main">
                  {handednessLabel}
                  {handednessScore !== null ? ` (${handednessScore.toFixed(2)})` : ''}
                </p>
              </div>
              <div className="rounded-sm border border-border-subtle bg-surface-alt p-2">
                <p className="text-text-muted">FPS</p>
                <p className="font-semibold text-text-main">{fps.toFixed(1)}</p>
              </div>
            </div>

            {cameraError && <p className="text-sm text-amber-700">{cameraError}</p>}
            {trackingError && <p className="text-sm text-amber-700">{trackingError}</p>}
          </Card>

          <Card className="p-3 h-fit max-h-[calc(100vh-120px)] overflow-y-auto">
            <h2 className="text-sm font-semibold text-text-main mb-2">Landmark Coordinates</h2>
            {landmarks.length === 0 ? (
              <p className="text-xs text-text-muted">No hand detected.</p>
            ) : (
              <div className="space-y-1">
                {landmarks.map((point, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-sm border border-border-subtle bg-surface-alt px-2 py-1 text-xs"
                  >
                    <span className="font-semibold text-text-main">LM {idx}</span>
                    <span className="text-text-muted">
                      x: {point.x.toFixed(4)} y: {point.y.toFixed(4)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ClinicianLayout>
  );
}

