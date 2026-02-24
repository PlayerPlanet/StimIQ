import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from 'react-native';
import { Accelerometer } from 'expo-sensors';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ScreenWrapper } from '../components/ScreenWrapper';
import { Card } from '../components/Card';
import { uploadIMUBatch } from '../lib/apiClient';
import type { IMUSample, IMUBatchPayload } from '../lib/types';

const DEMO_PATIENT_ID = 'imu-demo-user';
const MAX_BUFFER_SIZE = 500;
const UPLOAD_INTERVAL_MS = 5000;
const DEVICE_ID_KEY = 'imu_device_id';

function generateDeviceId(): string {
  return `device_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

async function getOrCreateDeviceId(): Promise<string> {
  try {
    const existing = await AsyncStorage.getItem(DEVICE_ID_KEY);
    if (existing) return existing;
    const id = generateDeviceId();
    await AsyncStorage.setItem(DEVICE_ID_KEY, id);
    return id;
  } catch {
    return generateDeviceId();
  }
}

export default function ImuTrackingScreen() {
  const [isTracking, setIsTracking] = useState(false);
  const [currentReading, setCurrentReading] = useState<{ ax: number; ay: number; az: number } | null>(null);
  const [sampleCount, setSampleCount] = useState(0);
  const [lastUploadTime, setLastUploadTime] = useState<Date | null>(null);
  const [lastUploadCount, setLastUploadCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const bufferRef = useRef<IMUSample[]>([]);
  const deviceIdRef = useRef<string>('');
  const subscriptionRef = useRef<ReturnType<typeof Accelerometer.addListener> | null>(null);
  const uploadIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const sessionIdRef = useRef<string | null>(null);

  useEffect(() => {
    void getOrCreateDeviceId().then((id) => {
      deviceIdRef.current = id;
    });

    // Set accelerometer update interval (ms between updates)
    Accelerometer.setUpdateInterval(20); // ~50 Hz

    return () => {
      stopTracking();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const uploadBatch = useCallback(async (samplesToUpload: IMUSample[]) => {
    if (samplesToUpload.length === 0) return;
    const sid = sessionIdRef.current ?? '';
    try {
      const batch: IMUBatchPayload = {
        patient_id: DEMO_PATIENT_ID,
        device_id: deviceIdRef.current,
        session_id: sid,
        samples: samplesToUpload,
        meta: {
          sampling_hz: 50,
          user_agent: `Expo/${Platform.OS}`,
        },
      };
      const response = await uploadIMUBatch(batch);
      setLastUploadTime(new Date());
      setLastUploadCount(response.inserted);
    } catch (err) {
      setErrorMessage(`Upload failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
      // Push samples back to buffer for retry
      bufferRef.current.unshift(...samplesToUpload);
    }
  }, []);

  const startTracking = useCallback(async () => {
    setErrorMessage(null);
    setSampleCount(0);
    setLastUploadTime(null);
    setLastUploadCount(0);
    bufferRef.current = [];

    const newSessionId = `session_${Date.now()}`;
    sessionIdRef.current = newSessionId;
    setSessionId(newSessionId);

    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const sample: IMUSample = {
        timestamp: Date.now(),
        ax: x,
        ay: y,
        az: z,
      };
      bufferRef.current.push(sample);
      setSampleCount((prev) => prev + 1);
      setCurrentReading({ ax: x, ay: y, az: z });

      if (bufferRef.current.length >= MAX_BUFFER_SIZE) {
        const samplesToUpload = bufferRef.current.splice(0, MAX_BUFFER_SIZE);
        void uploadBatch(samplesToUpload);
      }
    });
    subscriptionRef.current = sub;

    uploadIntervalRef.current = setInterval(() => {
      if (bufferRef.current.length > 0) {
        const samplesToUpload = bufferRef.current.splice(0);
        void uploadBatch(samplesToUpload);
      }
    }, UPLOAD_INTERVAL_MS);

    setIsTracking(true);
  }, [uploadBatch]);

  const stopTracking = useCallback(async () => {
    subscriptionRef.current?.remove();
    subscriptionRef.current = null;

    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }

    if (bufferRef.current.length > 0) {
      const remaining = bufferRef.current.splice(0);
      await uploadBatch(remaining);
    }

    setIsTracking(false);
    setCurrentReading(null);
    setSessionId(null);
    sessionIdRef.current = null;
  }, [uploadBatch]);

  return (
    <ScreenWrapper>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>IMU Tracking</Text>
        <Text style={styles.subtitle}>
          Monitor movement using your device's accelerometer to help track Parkinson's symptoms.
        </Text>
      </View>

      <Card style={styles.infoCard}>
        <Text style={styles.infoTitle}>How it works</Text>
        <Text style={styles.infoBody}>
          This screen uses your device's motion sensors to continuously capture acceleration data.
          Keep your phone in a consistent position while tracking. Data is sent to our secure
          servers in batches for analysis.
        </Text>
      </Card>

      {errorMessage && (
        <Card style={styles.errorCard}>
          <Text style={styles.errorTitle}>Error</Text>
          <Text style={styles.errorBody}>{errorMessage}</Text>
        </Card>
      )}

      <Card>
        <Text style={styles.sectionTitle}>Tracking Control</Text>
        {!isTracking ? (
          <TouchableOpacity style={styles.startBtn} onPress={startTracking}>
            <Text style={styles.startBtnText}>Start Tracking</Text>
          </TouchableOpacity>
        ) : (
          <>
            <Text style={styles.trackingIndicator}>● Recording accelerometer data...</Text>
            <TouchableOpacity style={styles.stopBtn} onPress={stopTracking}>
              <Text style={styles.stopBtnText}>Stop Tracking</Text>
            </TouchableOpacity>
          </>
        )}
      </Card>

      {isTracking && currentReading && (
        <Card>
          <Text style={styles.sectionTitle}>Current Readings</Text>
          <View style={styles.readingsRow}>
            <View style={styles.readingItem}>
              <Text style={styles.readingAxis}>X (g)</Text>
              <Text style={styles.readingValue}>{currentReading.ax.toFixed(2)}</Text>
            </View>
            <View style={styles.readingItem}>
              <Text style={styles.readingAxis}>Y (g)</Text>
              <Text style={styles.readingValue}>{currentReading.ay.toFixed(2)}</Text>
            </View>
            <View style={styles.readingItem}>
              <Text style={styles.readingAxis}>Z (g)</Text>
              <Text style={styles.readingValue}>{currentReading.az.toFixed(2)}</Text>
            </View>
          </View>
        </Card>
      )}

      {isTracking && (
        <Card>
          <Text style={styles.sectionTitle}>Session Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>Session ID:</Text>
            <Text style={styles.infoRowValue} numberOfLines={1}>
              {sessionId?.substring(0, 16)}...
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoRowLabel}>Total Samples:</Text>
            <Text style={styles.infoRowValueBold}>{sampleCount}</Text>
          </View>
          {lastUploadTime && (
            <>
              <View style={styles.infoRow}>
                <Text style={styles.infoRowLabel}>Last Upload:</Text>
                <Text style={styles.infoRowValue}>{lastUploadTime.toLocaleTimeString()}</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoRowLabel}>Uploaded Samples:</Text>
                <Text style={styles.infoRowValueBold}>{lastUploadCount}</Text>
              </View>
            </>
          )}
        </Card>
      )}
    </ScreenWrapper>
  );
}

const styles = StyleSheet.create({
  headerBlock: {
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1e293b',
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginTop: 4,
  },
  infoCard: {
    backgroundColor: '#eff6ff',
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  infoBody: {
    fontSize: 12,
    color: '#64748b',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  errorTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#b91c1c',
  },
  errorBody: {
    fontSize: 12,
    color: '#dc2626',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 12,
  },
  startBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  startBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  trackingIndicator: {
    color: '#16a34a',
    fontWeight: '500',
    marginBottom: 8,
  },
  stopBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  stopBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  readingsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  readingItem: {
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    flex: 1,
    marginHorizontal: 4,
    paddingVertical: 10,
    borderRadius: 8,
  },
  readingAxis: {
    fontSize: 11,
    color: '#64748b',
  },
  readingValue: {
    fontSize: 20,
    fontWeight: '600',
    color: '#1e293b',
    marginTop: 2,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  infoRowLabel: {
    fontSize: 14,
    color: '#64748b',
  },
  infoRowValue: {
    fontSize: 14,
    color: '#1e293b',
  },
  infoRowValueBold: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
});
