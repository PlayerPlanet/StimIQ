import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { FilesetResolver, HandLandmarker } from '@mediapipe/tasks-vision';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { getFingerTapSessionResult, processFingerTapSession } from '../../lib/apiClient';
import type { FingerTapFrameInput, FingerTapSessionResult, HandTrackingPoint } from '../../lib/types';

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.min(1, Math.max(0, value));
}

const MAX_CAPTURE_MS = 15000;

export function PatientFingerTappingTestSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const lastVideoTimeRef = useRef<number>(-1);
  const captureStartTimeRef = useRef<number>(0);
  const capturedFramesRef = useRef<FingerTapFrameInput[]>([]);
  const captureRunningRef = useRef<boolean>(false);
  const autoProcessTriggeredRef = useRef<boolean>(false);
  const traceRef = useRef<HandTrackingPoint[]>([]);
  const frameCounterRef = useRef<number>(0);
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [trackingState, setTrackingState] = useState<'idle' | 'loading' | 'active' | 'error'>('idle');
  const [trackingError, setTrackingError] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<'idle' | 'capturing' | 'completed'>('idle');
  const [capturedCount, setCapturedCount] = useState(0);
  const [liveFinger, setLiveFinger] = useState<HandTrackingPoint | null>(null);
  const [tracePoints, setTracePoints] = useState<HandTrackingPoint[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<FingerTapSessionResult | null>(null);
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

  const processCapturedFrames = async (frames: FingerTapFrameInput[]) => {
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
      await processFingerTapSession(sessionId, { frames });
      const response = await getFingerTapSessionResult(sessionId);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process finger tapping session.');
    } finally {
      setIsSubmitting(false);
    }
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

  const startCapture = () => {
    capturedFramesRef.current = [];
    setCapturedCount(0);
    captureStartTimeRef.current = performance.now();
    captureRunningRef.current = true;
    autoProcessTriggeredRef.current = false;
    setCaptureState('capturing');
    setResult(null);
    setError(null);
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
        const detectResult = handLandmarker.detectForVideo(video, now);
        const landmarks = detectResult.landmarks?.[0];
        const handednessScore = detectResult.handednesses?.[0]?.[0]?.score;

        const thumbTip = landmarks?.[4];
        const indexTip = landmarks?.[8];

        if (indexTip) {
          const point = { x: clamp01(indexTip.x), y: clamp01(indexTip.y) };
          traceRef.current.push(point);
          if (traceRef.current.length > 250) {
            traceRef.current.shift();
          }
          setLiveFinger(point);
        } else {
          setLiveFinger(null);
        }

        frameCounterRef.current += 1;
        if (frameCounterRef.current % 3 === 0) {
          setTracePoints([...traceRef.current]);
        }

        if (captureRunningRef.current) {
          const elapsedMs = Math.max(0, Math.round(now - captureStartTimeRef.current));
          const frame: FingerTapFrameInput = {
            t_ms: elapsedMs,
            thumb_tip: thumbTip ? { x: clamp01(thumbTip.x), y: clamp01(thumbTip.y) } : null,
            index_tip: indexTip ? { x: clamp01(indexTip.x), y: clamp01(indexTip.y) } : null,
            wrist: landmarks?.[0] ? { x: clamp01(landmarks[0].x), y: clamp01(landmarks[0].y) } : null,
            middle_mcp: landmarks?.[9] ? { x: clamp01(landmarks[9].x), y: clamp01(landmarks[9].y) } : null,
            conf: typeof handednessScore === 'number' ? clamp01(handednessScore) : landmarks ? 1 : 0,
          };
          capturedFramesRef.current.push(frame);

          if (capturedFramesRef.current.length % 5 === 0) {
            setCapturedCount(capturedFramesRef.current.length);
          }

          if (elapsedMs >= MAX_CAPTURE_MS) {
            captureRunningRef.current = false;
            setCaptureState('completed');
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

      lastVideoTimeRef.current = -1;
      traceRef.current = [];
      setTracePoints([]);
      setLiveFinger(null);
      setCameraState('active');
      setTrackingState('active');
      startCapture();
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
    captureRunningRef.current = false;
    setCameraState('idle');
    setTrackingState('idle');
    setCaptureState('idle');
    setLiveFinger(null);
    setTracePoints([]);
  };

  const resetCapture = () => {
    if (cameraState !== 'active') {
      return;
    }
    startCapture();
  };

  const handleManualProcess = async () => processCapturedFrames([...capturedFramesRef.current]);

  const tracePath = tracePoints.map((p) => `${p.x * 100},${p.y * 100}`).join(' ');

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Finger tapping in progress</h1>
            <p className="text-text-muted text-base mt-2">
              Session ID: {sessionId ?? 'not available'}
            </p>
          </div>

          <Card className="p-6 space-y-3">
            <h2 className="text-xl font-semibold text-text-main">Camera capture</h2>
            <p className="text-sm text-text-muted">
              Tap your thumb and index finger repeatedly for about 15 seconds while keeping your full hand visible.
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
                {liveFinger && (
                  <circle
                    cx={liveFinger.x * 100}
                    cy={liveFinger.y * 100}
                    r="1.4"
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth="0.3"
                  />
                )}
              </svg>
            </div>
            <p className="text-sm text-text-muted">
              Tracking: {trackingState} | Capture: {captureState} | Captured frames: {capturedCount}
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
                onClick={resetCapture}
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
                  Tap count: {result.metrics.tap_count}
                </p>
                <p className="text-sm text-text-muted">
                  Cadence: {result.metrics.cadence_hz?.toFixed(3) ?? 'N/A'} Hz
                </p>
                <p className="text-sm text-text-muted">
                  Mean amplitude: {result.metrics.mean_amp?.toFixed(4) ?? 'N/A'}
                </p>
                <p className="text-sm text-text-muted">
                  Pause count: {result.metrics.pause_count ?? 'N/A'}
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
