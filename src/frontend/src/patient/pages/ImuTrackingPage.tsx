import { useState, useEffect, useRef, useCallback } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { uploadIMUBatch } from '../../lib/apiClient';
import type { IMUSample, IMUBatchPayload } from '../../lib/types';

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
        </div>
      </div>
    </PatientLayout>
  );
}
