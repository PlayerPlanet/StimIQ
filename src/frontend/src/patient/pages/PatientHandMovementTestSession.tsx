import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { getLineFollowSessionResult, processLineFollowSession } from '../../lib/apiClient';
import type { LineFollowSessionResult } from '../../lib/types';

export function PatientHandMovementTestSession() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('sessionId');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'starting' | 'active' | 'error'>('idle');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<LineFollowSessionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buildFallbackFrames = useMemo(() => () => {
    const frameCount = 60;
    return Array.from({ length: frameCount }, (_, i) => {
      return {
        t_ms: i * 100,
        wrist_raw: null,
        conf: 0,
      };
    });
  }, []);

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
      streamRef.current = null;
    };
  }, []);

  const startCamera = async () => {
    setCameraState('starting');
    setCameraError(null);
    try {
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
    } catch (err) {
      setCameraState('error');
      setCameraError(err instanceof Error ? err.message : 'Failed to access webcam.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
    }
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraState('idle');
  };

  const handleSubmitStubRun = async () => {
    if (!sessionId) {
      setError('Missing session id. Please start the test again.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await processLineFollowSession(sessionId, { frames: buildFallbackFrames() });
      const response = await getLineFollowSessionResult(sessionId);
      setResult(response);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process hand movement session.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
              Connect your webcam and position your hand in view. This screen is now using live
              camera access.
            </p>
            <div className="rounded-sm border border-border-subtle bg-surface-alt p-3">
              <video
                ref={videoRef}
                className="w-full aspect-video rounded-sm bg-black object-cover"
                autoPlay
                muted
                playsInline
              />
            </div>
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
            </div>
            {cameraError && <p className="text-sm text-amber-700">{cameraError}</p>}
            <button
              type="button"
              onClick={() => void handleSubmitStubRun()}
              disabled={isSubmitting || !sessionId}
              className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60"
            >
              {isSubmitting ? 'Processing...' : 'Process session'}
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
              </div>
            )}
            <button
              type="button"
              onClick={() => navigate('/patient/standard-tests')}
              className="rounded-sm border border-border-subtle bg-surface px-4 py-2 text-sm font-semibold text-text-main hover:border-brand-blue"
            >
              End stub session
            </button>
          </Card>
        </div>
      </div>
    </PatientLayout>
  );
}
