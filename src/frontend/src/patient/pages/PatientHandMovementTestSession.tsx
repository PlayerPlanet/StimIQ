import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { getLineFollowSessionResult, processLineFollowSession } from '../../lib/apiClient';
import type { HandTrackingPoint, HandTrackingWristFrameInput, LineFollowSessionResult } from '../../lib/types';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

function distance(a: HandTrackingPoint, b: HandTrackingPoint): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

const P1: HandTrackingPoint = { x: 0.2, y: 0.75 };
const P2: HandTrackingPoint = { x: 0.8, y: 0.75 };
const START_RADIUS = 0.05;
const END_RADIUS = 0.05;
const COMPLETE_STREAK_FRAMES = 3;
const MAX_DURATION_MS = 15000;

export function PatientHandMovementTestSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const captureStartTimeRef = useRef<number>(0);
  const capturedFramesRef = useRef<HandTrackingWristFrameInput[]>([]);
  const completionStreakRef = useRef<number>(0);
  const captureModeRef = useRef<'idle' | 'waiting_start' | 'capturing' | 'completed'>('idle');
  const autoProcessTriggeredRef = useRef<boolean>(false);
  const traceRef = useRef<HandTrackingPoint[]>([]);
  const frameCounterRef = useRef<number>(0);
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingState, setTrackingState] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<'idle' | 'waiting_start' | 'capturing' | 'completed'>('idle');
  const [capturedCount, setCapturedCount] = useState(0);
  const [liveWrist, setLiveWrist] = useState<HandTrackingPoint | null>(null);
  const [tracePoints, setTracePoints] = useState<HandTrackingPoint[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<LineFollowSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

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

  const processCapturedFrames = async (frames: HandTrackingWristFrameInput[]) => {
    if (!sessionId) {
      setError('Missing session id. Please start the test again.');
      return;
    }
    if (frames.length === 0) {
      setError('No captured frames available.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await processLineFollowSession(sessionId, { frames });
      const response = await getLineFollowSessionResult(sessionId);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process hand movement session.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const beginWaitingCapture = () => {
    captureModeRef.current = 'waiting_start';
    setCaptureMode('waiting_start');
    capturedFramesRef.current = [];
    traceRef.current = [];
    setTracePoints([]);
    setCapturedCount(0);
    completionStreakRef.current = 0;
    autoProcessTriggeredRef.current = false;
    setResult(null);
    setError(null);
  };

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
    const detectFrame = () => {
      const video = videoRef.current;
      const handLandmarker = handLandmarkerRef.current;
      if (!video || !handLandmarker || !streamRef.current) {
        return;
      }

      if (video.readyState >= 2 && video.currentTime !== lastVideoTimeRef.current) {
        lastVideoTimeRef.current = video.currentTime;
        const now = performance.now();
        const tMs = Math.max(0, Math.round(now - captureStartTimeRef.current));
        const result = handLandmarker.detectForVideo(video, now);
        const wristLandmark = result.landmarks?.[0]?.[0];
        const handednessScore = result.handednesses?.[0]?.[0]?.score;

        const frame: HandTrackingWristFrameInput = {
          t_ms: tMs,
          wrist_raw: wristLandmark
            ? {
                x: clamp01(wristLandmark.x),
                y: clamp01(wristLandmark.y),
              }
            : null,
          conf: typeof handednessScore === 'number' ? clamp01(handednessScore) : wristLandmark ? 1 : 0,
        };

        if (frame.wrist_raw) {
          traceRef.current.push(frame.wrist_raw);
          if (traceRef.current.length > 200) {
            traceRef.current.shift();
          }
          setLiveWrist(frame.wrist_raw);
        } else {
          setLiveWrist(null);
        }

        frameCounterRef.current += 1;
        if (frameCounterRef.current % 3 === 0) {
          setTracePoints([...traceRef.current]);
        }

        if (captureModeRef.current === 'waiting_start' && frame.wrist_raw) {
          if (distance(frame.wrist_raw, P1) <= START_RADIUS) {
            captureModeRef.current = 'capturing';
            setCaptureMode('capturing');
            capturedFramesRef.current = [];
            captureStartTimeRef.current = now;
            completionStreakRef.current = 0;
            autoProcessTriggeredRef.current = false;
          }
        }

        if (captureModeRef.current === 'capturing') {
          const elapsedMs = Math.max(0, Math.round(now - captureStartTimeRef.current));
          const captureFrame: HandTrackingWristFrameInput = {
            t_ms: elapsedMs,
            wrist_raw: frame.wrist_raw,
            conf: frame.conf,
          };
          capturedFramesRef.current.push(captureFrame);

          if (captureFrame.wrist_raw && distance(captureFrame.wrist_raw, P2) <= END_RADIUS) {
            completionStreakRef.current += 1;
          } else {
            completionStreakRef.current = 0;
          }

          if (capturedFramesRef.current.length % 5 === 0) {
            setCapturedCount(capturedFramesRef.current.length);
          }

          const completedByTarget = completionStreakRef.current >= COMPLETE_STREAK_FRAMES;
          const completedByTimeout = elapsedMs >= MAX_DURATION_MS;
          if (completedByTarget || completedByTimeout) {
            captureModeRef.current = 'completed';
            setCaptureMode('completed');
            setCapturedCount(capturedFramesRef.current.length);
            if (!autoProcessTriggeredRef.current) {
              autoProcessTriggeredRef.current = true;
              void processCapturedFrames([...capturedFramesRef.current]);
            }
          }
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

      capturedFramesRef.current = [];
      setCapturedCount(0);
      captureStartTimeRef.current = performance.now();
      lastVideoTimeRef.current = -1;
      completionStreakRef.current = 0;
      traceRef.current = [];
      setTracePoints([]);
      setLiveWrist(null);
      setCameraState('active');
      setTrackingState('active');
      beginWaitingCapture();
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
    setCaptureMode('idle');
    captureModeRef.current = 'idle';
    setLiveWrist(null);
    setTracePoints([]);
  };

  const handleManualProcess = async () => processCapturedFrames([...capturedFramesRef.current]);

  const tracePath = tracePoints.map((p) => `${p.x * 100},${p.y * 100}`).join(' ');

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Hand movement tracking in progress</h1>
            <p className="text-text-muted text-base mt-2">
              Session ID: {sessionId ?? 'not available'}
            </p>
          </div>

          <Card className="p-6 space-y-3">
            <h2 className="text-xl font-semibold text-text-main">Camera capture</h2>
            <p className="text-sm text-text-muted">
              Move your wrist from the green start circle to the red end circle. Tracking starts
              automatically when your wrist reaches green, and stops when it reaches red.
            </p>
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
                <line
                  x1={P1.x * 100}
                  y1={P1.y * 100}
                  x2={P2.x * 100}
                  y2={P2.y * 100}
                  stroke="#3b82f6"
                  strokeWidth="0.8"
                  strokeDasharray="2 1"
                />
                <circle
                  cx={P1.x * 100}
                  cy={P1.y * 100}
                  r={START_RADIUS * 100}
                  fill="rgba(34, 197, 94, 0.12)"
                  stroke="#16a34a"
                  strokeWidth="0.5"
                />
                <circle
                  cx={P2.x * 100}
                  cy={P2.y * 100}
                  r={END_RADIUS * 100}
                  fill="rgba(239, 68, 68, 0.12)"
                  stroke="#dc2626"
                  strokeWidth="0.5"
                />
                {tracePath && (
                  <polyline
                    points={tracePath}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="0.8"
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                )}
                {liveWrist && (
                  <circle
                    cx={liveWrist.x * 100}
                    cy={liveWrist.y * 100}
                    r="1.4"
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth="0.3"
                  />
                )}
              </svg>
            </div>
            <p className="text-sm text-text-muted">
              Tracking: {trackingState} | Capture: {captureMode} | Captured frames: {capturedCount}
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => void startCamera()}
                disabled={cameraState === 'starting' || cameraState === 'active'}
                className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60"
              >
                {cameraState === 'starting' ? 'Starting camera...' : 'Start camera'}
              </button>
              <button
                type="button"
                onClick={stopCamera}
                disabled={cameraState !== 'active'}
                className="rounded-sm border border-border-subtle bg-surface px-4 py-2 text-sm font-semibold text-text-main hover:border-brand-blue disabled:opacity-60"
              >
                Stop camera
              </button>
              <button
                type="button"
                onClick={beginWaitingCapture}
                disabled={cameraState !== 'active'}
                className="rounded-sm border border-border-subtle bg-surface px-4 py-2 text-sm font-semibold text-text-main hover:border-brand-blue disabled:opacity-60"
              >
                Reset capture
              </button>
            </div>
            {cameraError && <p className="text-sm text-amber-700">{cameraError}</p>}
            {trackingError && <p className="text-sm text-amber-700">{trackingError}</p>}
            <button
              type="button"
              onClick={() => void handleManualProcess()}
              disabled={isSubmitting || !sessionId}
              className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60"
            >
              {isSubmitting ? 'Processing...' : 'Process current capture manually'}
            </button>
            {error && <p className="text-sm text-amber-700">{error}</p>}
            {result && (
              <div className="rounded-sm border border-border-subtle bg-surface-alt p-3 space-y-2">
                <p className="text-sm font-semibold text-text-main">Backend result</p>
                <p className="text-sm text-text-muted">
                  Completed: {result.metrics.completed ? 'Yes' : 'No'}
                </p>
                <p className="text-sm text-text-muted">
                  Time to complete: {result.metrics.time_to_complete_ms ?? 'N/A'} ms
                </p>
                <p className="text-sm text-text-muted">
                  End distance: {result.metrics.D_end?.toFixed(4) ?? 'N/A'}
                </p>
                <p className="text-sm text-text-muted">
                  Straightness ratio: {result.metrics.straightness_ratio.toFixed(4)}
                </p>
                <p className="text-sm text-text-muted">
                  Visible fraction: {result.quality.visible_fraction.toFixed(4)}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/patient/standard-tests')}
              className="rounded-sm border border-border-subtle bg-surface px-4 py-2 text-sm font-semibold text-text-main hover:border-brand-blue"
            >
              End session
            </button>
          </Card>
        </div>
      </div>
    </PatientLayout>
  );
}
