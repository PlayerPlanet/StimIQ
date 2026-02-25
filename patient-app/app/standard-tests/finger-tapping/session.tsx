import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { Card } from '../../../components/Card';

/**
 * Finger Tapping Test Session
 *
 * Uses the device camera to record a 15-second finger tapping clip.
 * On mobile, real-time landmark extraction is not yet available natively;
 * the recorded video URI is displayed and can be uploaded to a backend
 * video-processing pipeline.
 *
 * To enable full landmark-based processing (matching the web experience),
 * integrate react-native-vision-camera with a TFLite or Core ML hand pose
 * model and wire the extracted finger-tip coordinates to processFingerTapSession().
 */
export default function FingerTappingSessionScreen() {
  const { sessionId } = useLocalSearchParams<{ sessionId: string }>();
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const cameraRef = useRef<CameraView>(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordedUri, setRecordedUri] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = async () => {
    if (!cameraRef.current) return;
    setError(null);
    setRecordedUri(null);
    setElapsedMs(0);
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      setElapsedMs((prev) => prev + 100);
    }, 100);

    try {
      const video = await cameraRef.current.recordAsync({ maxDuration: 15 });
      setRecordedUri(video?.uri ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Recording failed.');
    } finally {
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  };

  const stopRecording = () => {
    cameraRef.current?.stopRecording();
  };

  if (!permission) {
    return (
      <ScreenWrapper>
        <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  if (!permission.granted) {
    return (
      <ScreenWrapper>
        <Card>
          <Text style={styles.permissionTitle}>Camera permission required</Text>
          <Text style={styles.permissionBody}>
            This test uses your camera to record your finger tapping motion.
          </Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Grant Permission</Text>
          </TouchableOpacity>
        </Card>
      </ScreenWrapper>
    );
  }

  const progressPct = Math.min(100, (elapsedMs / 15000) * 100);

  return (
    <View style={styles.fullScreen}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        mode="video"
      />

      <View style={styles.controls}>
        <Text style={styles.instruction}>
          Tap thumb ↔ index finger repeatedly · keep your full hand visible
        </Text>

        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.timerLabel}>
          {(elapsedMs / 1000).toFixed(1)}s / 15s
        </Text>

        {error && <Text style={styles.errorText}>{error}</Text>}

        {recordedUri ? (
          <Card style={styles.resultCard}>
            <Text style={styles.resultTitle}>Recording complete</Text>
            <Text style={styles.resultBody} numberOfLines={2}>
              Saved: {recordedUri}
            </Text>
            <Text style={styles.resultNote}>Session ID: {sessionId}</Text>
            <TouchableOpacity
              style={styles.primaryBtn}
              onPress={() => router.push('/standard-tests')}
            >
              <Text style={styles.primaryBtnText}>Back to Standard Tests</Text>
            </TouchableOpacity>
          </Card>
        ) : (
          <View style={styles.btnRow}>
            {!isRecording ? (
              <TouchableOpacity style={styles.recordBtn} onPress={startRecording}>
                <Text style={styles.recordBtnText}>Start Recording</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.stopBtn} onPress={stopRecording}>
                <Text style={styles.stopBtnText}>Stop Recording</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.secondaryBtn}
              onPress={() => router.push('/standard-tests')}
            >
              <Text style={styles.secondaryBtnText}>End Session</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: '#000',
  },
  camera: {
    flex: 1,
  },
  controls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    padding: 20,
    paddingBottom: 36,
  },
  instruction: {
    color: '#e2e8f0',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#334155',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#3b82f6',
    borderRadius: 3,
  },
  timerLabel: {
    color: '#94a3b8',
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 12,
  },
  errorText: {
    color: '#fca5a5',
    fontSize: 13,
    marginBottom: 8,
  },
  btnRow: {
    flexDirection: 'row',
    gap: 10,
  },
  recordBtn: {
    flex: 1,
    backgroundColor: '#16a34a',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  recordBtnText: { color: '#fff', fontWeight: '600' },
  stopBtn: {
    flex: 1,
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  stopBtnText: { color: '#fff', fontWeight: '600' },
  secondaryBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  secondaryBtnText: { color: '#cbd5e1', fontWeight: '600' },
  resultCard: {
    backgroundColor: 'rgba(15,23,42,0.9)',
  },
  resultTitle: { fontSize: 16, fontWeight: '600', color: '#f1f5f9', marginBottom: 4 },
  resultBody: { fontSize: 12, color: '#94a3b8', marginBottom: 4 },
  resultNote: { fontSize: 12, color: '#94a3b8', marginBottom: 12 },
  primaryBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryBtnText: { color: '#fff', fontWeight: '600' },
  permissionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  permissionBody: { fontSize: 14, color: '#64748b', marginBottom: 12 },
});
