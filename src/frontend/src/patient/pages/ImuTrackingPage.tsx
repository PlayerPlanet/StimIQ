import { useState, useEffect, useRef, useCallback } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { uploadIMUBatch, analyzeIMUTremor } from '../../lib/apiClient';
import type { IMUSample, IMUBatchPayload, IMUAnalysisResponse } from '../../lib/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area, ReferenceLine } from 'recharts';

const DEMO_PATIENT_ID = 'imu-demo-user';
const MAX_BUFFER_SIZE = 500;
const UPLOAD_INTERVAL_MS = 5000;

interface AccelerationData {
  ax: number;
  ay: number;
  az: number;
}

interface UseIMUTrackingReturn {
  permissionState: 'not-requested' | 'granted' | 'denied' | 'unavailable';
  trackingState: 'idle' | 'tracking' | 'error';
  currentReading: AccelerationData | null;
  sampleCount: number;
  lastUploadTime: Date | null;
  lastUploadCount: number;
  errorMessage: string | null;
  sessionId: string | null;
  requestPermission: () => Promise<void>;
  startTracking: () => Promise<void>;
  stopTracking: () => Promise<void>;
}

function useIMUTracking(): UseIMUTrackingReturn {
  const [permissionState, setPermissionState] = useState<'not-requested' | 'granted' | 'denied' | 'unavailable'>(
    'not-requested'
  );
  const [trackingState, setTrackingState] = useState<'idle' | 'tracking' | 'error'>('idle');
  const [currentReading, setCurrentReading] = useState<AccelerationData | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null);
  const [lastUploadCount, setLastUploadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const bufferRef = useRef<IMUSample[]>([]);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Initialize device ID from localStorage
  const getDeviceId = (): string => {
    let deviceId = localStorage.getItem('imu_device_id');
    if (!deviceId) {
      deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem('imu_device_id', deviceId);
    }
    return deviceId;
  };
  const deviceIdRef = useRef<string>(getDeviceId());

  // Check if DeviceMotion is available
  useEffect(() => {
    if (typeof DeviceMotionEvent === 'undefined') {
      setPermissionState('unavailable');
    } else if (typeof (DeviceMotionEvent as any).requestPermission === 'function') {
      // iOS 13+
      setPermissionState('not-requested');
    } else {
      // Android or older iOS
      setPermissionState('granted');
    }
  }, []);

  const requestPermission = useCallback(async () => {
    try {
      if (typeof (DeviceMotionEvent as any).requestPermission !== 'function') {
        // Already has permission (Android or older iOS)
        setPermissionState('granted');
        return;
      }

      const permission = await (DeviceMotionEvent as any).requestPermission();
      if (permission === 'granted') {
        setPermissionState('granted');
        setErrorMessage(null);
      } else {
        setPermissionState('denied');
        setErrorMessage('Motion sensor permission denied. Please enable it in device settings.');
      }
    } catch (error) {
      setPermissionState('denied');
      setErrorMessage('Failed to request motion sensor permission.');
      console.error('Permission request error:', error);
    }
  }, []);

  const uploadBatch = useCallback(async (samplesToUpload: IMUSample[]) => {
    if (samplesToUpload.length === 0) return;

    try {
      const batch: IMUBatchPayload = {
        patient_id: DEMO_PATIENT_ID,
        device_id: deviceIdRef.current,
        session_id: sessionId || '',
        samples: samplesToUpload,
        meta: {
          user_agent: navigator.userAgent,
          sampling_hz: 50,
        },
      };

      const response = await uploadIMUBatch(batch);
      setLastUploadTime(new Date());
      setLastUploadCount(response.inserted);
      console.log(`Uploaded ${response.inserted} IMU samples`);
    } catch (error) {
      console.error('Failed to upload IMU batch:', error);
      setErrorMessage(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      // Push samples back to buffer for retry
      bufferRef.current.unshift(...samplesToUpload);
    }
  }, [sessionId]);

  const startTracking = useCallback(async () => {
    if (permissionState !== 'granted') {
      setErrorMessage('Permission not granted. Please request permission first.');
      return;
    }

    setTrackingState('tracking');
    setErrorMessage(null);
    setSampleCount(0);
    setLastUploadTime(null);
    setLastUploadCount(0);

    const newSessionId = crypto.randomUUID?.() || `session_${Date.now()}`;
    setSessionId(newSessionId);
    bufferRef.current = [];

    // Attach devicemotion listener
    const handleDeviceMotion = (event: DeviceMotionEvent) => {
      const accel = event.accelerationIncludingGravity || event.acceleration;
      if (!accel) return;

      const sample: IMUSample = {
        timestamp: Date.now(),
        ax: accel.x ?? 0,
        ay: accel.y ?? 0,
        az: accel.z ?? 0,
      };

      bufferRef.current.push(sample);
      setSampleCount((prev: number) => prev + 1);
      setCurrentReading({ ax: sample.ax, ay: sample.ay, az: sample.az });

      // Upload immediately if buffer is full
      if (bufferRef.current.length >= MAX_BUFFER_SIZE) {
        const samplesToUpload = bufferRef.current.splice(0, MAX_BUFFER_SIZE);
        uploadBatch(samplesToUpload);
      }
    };

    window.addEventListener('devicemotion', handleDeviceMotion);

    // Set up periodic upload
    if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
    uploadIntervalRef.current = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const samplesToUpload = bufferRef.current.splice(0);
        uploadBatch(samplesToUpload);
      }
    }, UPLOAD_INTERVAL_MS);
  }, [permissionState, uploadBatch]);

  const stopTracking = useCallback(async () => {
    setTrackingState('idle');
    window.removeEventListener('devicemotion', () => {});

    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    // Flush remaining samples
    if (bufferRef.current.length > 0) {
      const remainingSamples = bufferRef.current.splice(0);
      await uploadBatch(remainingSamples);
    }

    setSessionId(null);
  }, [uploadBatch]);

  return {
    permissionState,
    trackingState,
    currentReading,
    sampleCount,
    lastUploadTime,
    lastUploadCount,
    errorMessage,
    sessionId,
    requestPermission,
    startTracking,
    stopTracking,
  };
}

export function ImuTrackingPage() {
  const {
    permissionState,
    trackingState,
    currentReading,
    sampleCount,
    lastUploadTime,
    lastUploadCount,
    errorMessage,
    sessionId,
    requestPermission,
    startTracking,
    stopTracking,
  } = useIMUTracking();

  const [analysisUserId, setAnalysisUserId] = useState(DEMO_PATIENT_ID);
  const [analysisStart, setAnalysisStart] = useState('');
  const [analysisEnd, setAnalysisEnd] = useState('');
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<IMUAnalysisResponse | null>(null);

  const handleAnalyzeSignal = async () => {
    if (!analysisUserId || !analysisStart || !analysisEnd) {
      setAnalysisError('Please provide a user ID, start time, and end time.');
      return;
    }

    const startDate = new Date(analysisStart);
    const endDate = new Date(analysisEnd);

    if (Number.isNaN(startDate.valueOf()) || Number.isNaN(endDate.valueOf())) {
      setAnalysisError('Please provide valid start and end times.');
      return;
    }

    if (endDate <= startDate) {
      setAnalysisError('End time must be after start time.');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const result = await analyzeIMUTremor({
        user_id: analysisUserId,
        start_time: startDate.toISOString(),
        end_time: endDate.toISOString(),
      });
      setAnalysisResult(result);
    } catch (error) {
      setAnalysisError(error instanceof Error ? error.message : 'Failed to analyze signal.');
    } finally {
      setAnalysisLoading(false);
    }
  };

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Page Header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-main">IMU Tracking</h1>
            <p className="text-text-muted text-base mt-2">
              Monitor movement using your device's accelerometer to help track Parkinson's symptoms.
            </p>
          </div>

          {/* Info Card */}
          <Card className="p-4 space-y-2 bg-brand-blue-soft">
            <p className="text-sm font-semibold text-text-main">How it works</p>
            <p className="text-xs text-text-muted">
              This page uses your device's motion sensors to continuously capture acceleration data. Keep
              your phone in a consistent position while tracking. Data is sent to our secure servers in
              batches for analysis.
            </p>
          </Card>

          {/* Error Message */}
          {errorMessage && (
            <Card className="p-4 border-l-4 border-red-500 bg-red-50">
              <p className="text-sm font-semibold text-red-700">Error</p>
              <p className="text-xs text-red-600 mt-1">{errorMessage}</p>
            </Card>
          )}

          {/* Permission Status Card */}
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-text-main mb-3">Permission Status</h2>
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      permissionState === 'granted'
                        ? 'bg-green-500'
                        : permissionState === 'denied'
                          ? 'bg-red-500'
                          : permissionState === 'unavailable'
                            ? 'bg-gray-400'
                            : 'bg-yellow-500'
                    }`}
                  />
                  <span className="text-sm font-medium text-text-main">
                    {permissionState === 'granted'
                      ? 'Permission Granted'
                      : permissionState === 'denied'
                        ? 'Permission Denied'
                        : permissionState === 'unavailable'
                          ? 'Unavailable'
                          : 'Not Requested'}
                  </span>
                </div>
              </div>
              {permissionState === 'not-requested' && (
                <p className="text-xs text-text-muted mb-3">
                  Motion sensors are available. Tap the button below to grant permission.
                </p>
              )}
              {permissionState === 'unavailable' && (
                <p className="text-xs text-text-muted mb-3">
                  Motion sensors are not available on this device. Please use a compatible mobile device.
                </p>
              )}
              {permissionState === 'not-requested' && (
                <button
                  onClick={requestPermission}
                  className="rounded-sm bg-brand-blue text-white px-4 py-2 text-sm font-semibold hover:bg-brand-navy transition-colors"
                >
                  Request Permission
                </button>
              )}
            </div>
          </Card>

          {/* Tracking Controls */}
          {permissionState === 'granted' && (
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold text-text-main">Tracking Control</h2>
              <div className="flex gap-3">
                {trackingState === 'idle' ? (
                  <button
                    onClick={startTracking}
                    className="rounded-sm bg-green-600 text-white px-6 py-2 font-semibold hover:bg-green-700 transition-colors"
                  >
                    Start Tracking
                  </button>
                ) : (
                  <button
                    onClick={stopTracking}
                    className="rounded-sm bg-red-600 text-white px-6 py-2 font-semibold hover:bg-red-700 transition-colors"
                  >
                    Stop Tracking
                  </button>
                )}
              </div>
              {trackingState === 'tracking' && (
                <p className="text-sm text-green-600 font-medium">● Recording accelerometer data...</p>
              )}
            </Card>
          )}

          {/* Current Readings */}
          {trackingState === 'tracking' && currentReading && (
            <Card className="p-6 space-y-4">
              <h2 className="font-semibold text-text-main">Current Readings</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-xs text-text-muted">X Axis (m/s²)</p>
                  <p className="text-xl font-semibold text-text-main">
                    {currentReading.ax.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-xs text-text-muted">Y Axis (m/s²)</p>
                  <p className="text-xl font-semibold text-text-main">
                    {currentReading.ay.toFixed(2)}
                  </p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-xs text-text-muted">Z Axis (m/s²)</p>
                  <p className="text-xl font-semibold text-text-main">
                    {currentReading.az.toFixed(2)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {/* Session Info */}
          {(sampleCount > 0 || lastUploadTime) && trackingState === 'tracking' && (
            <Card className="p-6 space-y-3">
              <h2 className="font-semibold text-text-main">Session Information</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Session ID:</span>
                  <code className="text-xs text-text-main font-mono bg-gray-50 px-2 py-1 rounded">
                    {sessionId?.substring(0, 12)}...
                  </code>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total Samples:</span>
                  <span className="font-semibold text-text-main">{sampleCount}</span>
                </div>
                {lastUploadTime && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Last Upload:</span>
                      <span className="text-xs text-text-main">
                        {lastUploadTime.toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-muted">Samples in Last Upload:</span>
                      <span className="font-semibold text-text-main">{lastUploadCount}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>
          )}

          {/* Idle State Message */}
          {trackingState === 'idle' && permissionState === 'granted' && sampleCount === 0 && (
            <Card className="p-6 text-center">
              <p className="text-text-muted">Ready to start. Tap "Start Tracking" above to begin.</p>
            </Card>
          )}

          {/* Tremor Analysis */}
          <Card className="p-6 space-y-4">
            <div>
              <h2 className="font-semibold text-text-main">Tremor Analysis</h2>
              <p className="text-xs text-text-muted mt-1">
                Analyze recorded IMU samples for tremor frequency, intensity, and duration.
              </p>
            </div>

            {analysisError && (
              <div className="rounded-sm border border-red-200 bg-red-50 p-3">
                <p className="text-xs text-red-700">{analysisError}</p>
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">User ID</label>
                <input
                  type="text"
                  value={analysisUserId}
                  onChange={(event) => setAnalysisUserId(event.target.value)}
                  className="w-full rounded-sm border border-border-subtle bg-surface px-3 py-2 text-sm text-text-main"
                  placeholder="imu-demo-user"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">Start Time</label>
                <input
                  type="datetime-local"
                  value={analysisStart}
                  onChange={(event) => setAnalysisStart(event.target.value)}
                  className="w-full rounded-sm border border-border-subtle bg-surface px-3 py-2 text-sm text-text-main"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-muted mb-2">End Time</label>
                <input
                  type="datetime-local"
                  value={analysisEnd}
                  onChange={(event) => setAnalysisEnd(event.target.value)}
                  className="w-full rounded-sm border border-border-subtle bg-surface px-3 py-2 text-sm text-text-main"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handleAnalyzeSignal}
                disabled={analysisLoading}
                className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60"
              >
                {analysisLoading ? 'Analyzing…' : 'Analyze Signal'}
              </button>
            </div>

            {analysisResult && (
              <>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <p className="text-xs text-text-muted">Dominant Frequency</p>
                    <p className="text-lg font-semibold text-text-main">
                      {analysisResult.dominant_frequency.toFixed(2)} Hz
                    </p>
                  </div>
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <p className="text-xs text-text-muted">Intensity (PSD AUC)</p>
                    <p className="text-lg font-semibold text-text-main">
                      {analysisResult.tremor_intensity.toExponential(2)}
                    </p>
                  </div>
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <p className="text-xs text-text-muted">Tremor Activity</p>
                    <p className="text-lg font-semibold text-text-main">
                      {analysisResult.tremor_activity_share.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <p className="text-xs text-text-muted">Mild Tremor</p>
                    <p className="text-lg font-semibold text-text-main">
                      {analysisResult.mild_tremor_share.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <p className="text-xs text-text-muted">Medium Tremor</p>
                    <p className="text-lg font-semibold text-text-main">
                      {analysisResult.medium_tremor_share.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <p className="text-xs text-text-muted">Intense Tremor</p>
                    <p className="text-lg font-semibold text-text-main">
                      {analysisResult.intense_tremor_share.toFixed(1)}%
                    </p>
                  </div>
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <p className="text-xs text-text-muted">Avg Event Duration</p>
                    <p className="text-lg font-semibold text-text-main">
                      {analysisResult.average_event_duration_seconds.toFixed(1)} s
                    </p>
                  </div>
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <p className="text-xs text-text-muted">Total Datapoints</p>
                    <p className="text-lg font-semibold text-text-main">
                      {analysisResult.total_datapoints.toLocaleString()}
                    </p>
                  </div>
                </div>

                {/* Actual Time Range */}
                {analysisResult.actual_start_time && analysisResult.actual_end_time && (
                  <div className="rounded-sm border border-border-subtle bg-brand-blue-soft p-4">
                    <h3 className="text-sm font-semibold text-text-main mb-2">Actual Data Time Range</h3>
                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-text-muted">First Sample:</span>
                        <p className="font-mono text-text-main mt-1">
                          {new Date(analysisResult.actual_start_time).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-text-muted">Last Sample:</span>
                        <p className="font-mono text-text-main mt-1">
                          {new Date(analysisResult.actual_end_time).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Continuity Timeline */}
                {analysisResult.data_continuity_timeline.length > 0 && (
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <h3 className="text-sm font-semibold text-text-main mb-3">Data Continuity Timeline</h3>
                    <p className="text-xs text-text-muted mb-4">
                      Blue blocks show continuous data. Gaps of 5+ seconds are shown as breaks.
                    </p>
                    <div className="space-y-4">
                      {/* Time axis */}
                      <div className="flex items-center justify-between text-xs text-text-muted px-1 mb-2">
                        <span>{new Date(analysisResult.actual_start_time!).toLocaleTimeString()}</span>
                        <span>{new Date(analysisResult.actual_end_time!).toLocaleTimeString()}</span>
                      </div>

                      {/* Timeline visualization */}
                      <div className="relative h-8 bg-gray-100 rounded-sm overflow-hidden flex border border-border-subtle">
                        {analysisResult.data_continuity_timeline.map((segment, idx) => {
                          const start = new Date(segment.start_time).getTime();
                          const end = new Date(segment.end_time).getTime();
                          const overallStart = new Date(analysisResult.actual_start_time!).getTime();
                          const overallEnd = new Date(analysisResult.actual_end_time!).getTime();
                          const totalDuration = overallEnd - overallStart;

                          const leftPercent = ((start - overallStart) / totalDuration) * 100;
                          const widthPercent = ((end - start) / totalDuration) * 100;

                          return (
                            <div
                              key={idx}
                              className={`absolute h-full transition-colors ${
                                segment.is_gap ? 'bg-white' : 'bg-brand-blue'
                              }`}
                              style={{
                                left: `${leftPercent}%`,
                                width: `${widthPercent}%`,
                              }}
                              title={`${segment.is_gap ? 'Gap' : 'Data'}: ${new Date(segment.start_time).toLocaleTimeString()} - ${new Date(segment.end_time).toLocaleTimeString()}`}
                            />
                          );
                        })}
                      </div>

                      {/* Duration info */}
                      <div className="text-xs text-text-muted">
                        Total span: {(
                          (new Date(analysisResult.actual_end_time!).getTime() -
                            new Date(analysisResult.actual_start_time!).getTime()) /
                          1000
                        ).toFixed(1)}s
                      </div>
                    </div>
                  </div>
                )}

                {/* Data Continuity Segments Details */}
                {analysisResult.data_segments.length > 0 && (
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <h3 className="text-sm font-semibold text-text-main mb-2">
                      Detailed Segments ({analysisResult.data_segments.length} segment{analysisResult.data_segments.length !== 1 ? 's' : ''})
                    </h3>
                    {analysisResult.data_segments.length > 1 && (
                      <p className="text-xs text-yellow-700 bg-yellow-50 p-2 rounded mb-2">
                        ⚠ Multiple segments detected. Gaps in data may affect analysis accuracy.
                      </p>
                    )}
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {analysisResult.data_segments.map((segment, idx) => (
                        <div key={idx} className="text-xs bg-gray-50 p-2 rounded">
                          <span className="font-semibold text-text-main">Segment {idx + 1}:</span>
                          <div className="mt-1 font-mono text-text-muted">
                            {new Date(segment.start_time).toLocaleTimeString()} → {new Date(segment.end_time).toLocaleTimeString()}
                            <span className="ml-2 text-xs">
                              ({((new Date(segment.end_time).getTime() - new Date(segment.start_time).getTime()) / 1000).toFixed(1)}s)
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tremor Intensity Time Series */}
                {analysisResult.tremor_intensity_timeseries.length > 0 && (
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <h3 className="text-sm font-semibold text-text-main mb-3">Tremor Intensity Over Time</h3>
                    <p className="text-xs text-text-muted mb-3">
                      Sliding window analysis (2s windows with 50% overlap) showing tremor band (4-7 Hz) power.
                      <span className="block mt-1">
                        <span className="inline-block w-3 h-0.5 bg-yellow-500 mr-1"></span>Activation (5.0) | 
                        <span className="inline-block w-3 h-0.5 bg-orange-500 mr-1 ml-2"></span>Mild (65) | 
                        <span className="inline-block w-3 h-0.5 bg-red-500 mr-1 ml-2"></span>Medium (150)
                      </span>
                    </p>
                    <ResponsiveContainer width="100%" aspect={5 / 3}>
                      <AreaChart
                        data={analysisResult.tremor_intensity_timeseries.map((point) => ({
                          time: new Date(point.time).toLocaleTimeString('en-US', { 
                            hour: '2-digit', 
                            minute: '2-digit', 
                            second: '2-digit', 
                            hour12: false 
                          }),
                          intensity: point.intensity,
                        }))}
                        margin={{ top: 5, right: 20, left: 10, bottom: 90 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="time"
                          stroke="#6b7280"
                          style={{ fontSize: '9px' }}
                          tick={{ fill: '#6b7280' }}
                          angle={-30}
                          textAnchor="end"
                          height={90}
                          tickMargin={12}
                          interval="preserveStartEnd"
                          minTickGap={30}
                        />
                        <YAxis
                          stroke="#6b7280"
                          style={{ fontSize: '10px' }}
                          tick={{ fill: '#6b7280' }}
                          tickFormatter={(value) => value.toExponential(0)}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                          formatter={(value?: number | string) => {
                            if (typeof value === 'number') {
                              return [value.toExponential(3), 'Intensity'];
                            }
                            return [value ?? '—', 'Intensity'];
                          }}
                        />
                        <ReferenceLine 
                          y={5.0} 
                          stroke="#eab308" 
                          strokeDasharray="3 3" 
                          strokeWidth={1.5} 
                          label={{ value: 'Activation', position: 'right', fontSize: 10, fill: '#ca8a04' }} 
                        />
                        <ReferenceLine 
                          y={65} 
                          stroke="#f97316" 
                          strokeDasharray="3 3" 
                          strokeWidth={1.5} 
                          label={{ value: 'Mild', position: 'right', fontSize: 10, fill: '#ea580c' }} 
                        />
                        <ReferenceLine 
                          y={150} 
                          stroke="#ef4444" 
                          strokeDasharray="3 3" 
                          strokeWidth={1.5} 
                          label={{ value: 'Medium', position: 'right', fontSize: 10, fill: '#dc2626' }} 
                        />
                        <Area
                          type="monotone"
                          dataKey="intensity"
                          stroke="#3b82f6"
                          fill="#93c5fd"
                          fillOpacity={0.6}
                          isAnimationActive={false}
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Power Spectrum */}
                {analysisResult.power_spectrum.length > 0 && (
                  <div className="rounded-sm border border-border-subtle bg-surface p-4">
                    <h3 className="text-sm font-semibold text-text-main mb-3">Aggregated Power Spectrum (0-20 Hz)</h3>
                    <p className="text-xs text-text-muted mb-3">
                      Average power spectral density across all windows. Tremor band (4-7 Hz) highlighted.
                      <span className="block mt-1">
                        <span className="inline-block w-3 h-0.5 bg-green-500 mr-1"></span>Tremor Band (4-7 Hz)
                      </span>
                    </p>
                    <ResponsiveContainer width="100%" height={300}>
                      <LineChart
                        data={analysisResult.power_spectrum.map(point => ({
                          frequency: point.frequency,
                          power: point.power,
                          inTremorBand: point.frequency >= 4 && point.frequency <= 7,
                        }))}
                        margin={{ top: 5, right: 20, left: 10, bottom: 25 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="frequency"
                          type="number"
                          domain={[0, 20]}
                          stroke="#6b7280"
                          style={{ fontSize: '10px' }}
                          tick={{ fill: '#6b7280' }}
                          tickFormatter={(value) => value.toFixed(1)}
                          label={{ value: 'Frequency (Hz)', position: 'insideBottom', offset: -5, style: { fontSize: '11px' } }}
                        />
                        <YAxis
                          stroke="#6b7280"
                          style={{ fontSize: '10px' }}
                          tick={{ fill: '#6b7280' }}
                          tickFormatter={(value) => value.toExponential(0)}
                          label={{ value: 'Power', angle: -90, position: 'insideLeft', style: { fontSize: '11px' } }}
                        />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '6px' }}
                          formatter={(value?: number | string, name?: string) => {
                            const label = name ?? 'Value';
                            if (label === 'power' && typeof value === 'number') {
                              return [value.toExponential(3), 'Power'];
                            }
                            return [value ?? '—', label];
                          }}
                          labelFormatter={(value) => `${Number(value ?? 0).toFixed(2)} Hz`}
                        />
                        <ReferenceLine 
                          x={4} 
                          stroke="#22c55e" 
                          strokeDasharray="3 3" 
                          strokeWidth={2} 
                          label={{ value: '4 Hz', position: 'top', fontSize: 10, fill: '#16a34a' }} 
                        />
                        <ReferenceLine 
                          x={7} 
                          stroke="#22c55e" 
                          strokeDasharray="3 3" 
                          strokeWidth={2} 
                          label={{ value: '7 Hz', position: 'top', fontSize: 10, fill: '#16a34a' }} 
                        />
                        <Line
                          type="monotone"
                          dataKey="power"
                          stroke="#3b82f6"
                          strokeWidth={2}
                          dot={false}
                          isAnimationActive={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </PatientLayout>
  );
}
