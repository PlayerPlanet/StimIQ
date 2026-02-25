import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Audio } from 'expo-av';
import { useRouter } from 'expo-router';
import { ScreenWrapper } from '../../../components/ScreenWrapper';
import { Card } from '../../../components/Card';
import { uploadSpeechRecordingRaw } from '../../../lib/apiClient';
import type { SpeechStepType } from '../../../lib/types';
import {
  getDataCollectionConsent,
  getOrCreateVisitorPatientId,
} from '../../../patient/utils/visitorIdentity';

interface SpeechStep {
  id: string;
  title: string;
  instruction: string;
  durationLabel: string;
  minDurationMs: number;
  maxDurationMs: number;
  prompt: string;
  stepType: SpeechStepType;
}

const SPEECH_STEPS: SpeechStep[] = [
  {
    id: 'sustained-vowel',
    title: 'Step 1: Sustained vowel',
    instruction: 'Take a breath and hold "aaa" in one continuous sound.',
    durationLabel: '10 to 15 seconds',
    minDurationMs: 10000,
    maxDurationMs: 15000,
    prompt: 'Say: "aaaaaaaaaa..."',
    stepType: 'SUSTAINED_VOWEL',
  },
  {
    id: 'standardized-sentence',
    title: 'Step 2: Standardized sentence',
    instruction: 'Read the fixed sentence clearly at a natural speaking pace.',
    durationLabel: 'About 5 to 10 seconds',
    minDurationMs: 5000,
    maxDurationMs: 10000,
    prompt: 'Sentence: "Today is a bright and calm day."',
    stepType: 'STANDARDIZED_SENTENCE',
  },
  {
    id: 'rapid-syllable',
    title: 'Step 3: Rapid syllable repetition',
    instruction: 'Repeat "pa-ta-ka" as quickly and clearly as possible.',
    durationLabel: '10 seconds',
    minDurationMs: 10000,
    maxDurationMs: 10000,
    prompt: 'Say repeatedly: "pa-ta-ka, pa-ta-ka, pa-ta-ka..."',
    stepType: 'RAPID_SYLLABLE_REPETITION',
  },
];

function generateSessionId(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (char) => {
    const random = Math.floor(Math.random() * 16);
    const value = char === 'x' ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function formatMs(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

export default function SpeechTaskSessionScreen() {
  const router = useRouter();
  const speechSessionId = useRef(generateSessionId());
  const recordingRef = useRef<Audio.Recording | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startedAtRef = useRef<number | null>(null);

  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [recordedSteps, setRecordedSteps] = useState<Record<string, { uri: string; durationMs: number; storagePath?: string }>>({});
  const [isRecording, setIsRecording] = useState(false);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [stepValidationMsg, setStepValidationMsg] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState<boolean | null>(null);

  const currentStep = SPEECH_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === SPEECH_STEPS.length - 1;
  const hasCurrentRecording = Boolean(recordedSteps[currentStep.id]);
  const isTaskComplete = completedStepIds.length === SPEECH_STEPS.length;

  const progressLabel = useMemo(
    () => `${Math.min(completedStepIds.length + 1, SPEECH_STEPS.length)} / ${SPEECH_STEPS.length}`,
    [completedStepIds.length]
  );

  useEffect(() => {
    // Request audio permissions on mount
    const requestAudioPermission = async () => {
      const { granted } = await Audio.requestPermissionsAsync();
      setPermissionGranted(granted);
      if (granted) {
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: true,
          playsInSilentModeIOS: true,
        });
      }
    };
    void requestAudioPermission();

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      void recordingRef.current?.stopAndUnloadAsync().catch(() => {});
    };
  }, []);

  const cleanupTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleStartRecording = async () => {
    if (isRecording || !permissionGranted) return;
    setRecordingError(null);
    setStepValidationMsg(null);
    setElapsedMs(0);
    startedAtRef.current = Date.now();

    try {
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording;
      setIsRecording(true);

      const maxMs = currentStep.maxDurationMs;
      timerRef.current = setInterval(() => {
        const elapsed = Date.now() - (startedAtRef.current ?? Date.now());
        setElapsedMs(elapsed);
        if (elapsed >= maxMs) {
          void handleStopRecording();
        }
      }, 100);
    } catch (err) {
      setRecordingError(
        err instanceof Error ? err.message : 'Could not start recording. Please allow microphone permission.'
      );
    }
  };

  const handleStopRecording = async () => {
    if (!recordingRef.current) return;
    cleanupTimer();
    setIsRecording(false);

    const activeStepId = currentStep.id;
    const activeStepType = currentStep.stepType;
    const durationMs = Math.max(0, Date.now() - (startedAtRef.current ?? Date.now()));
    startedAtRef.current = null;

    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();
      recordingRef.current = null;

      if (!uri) {
        setRecordingError('Recording URI not available.');
        return;
      }

      setRecordedSteps((prev) => ({
        ...prev,
        [activeStepId]: { uri, durationMs },
      }));

      // Get patient/session context for upload
      const consent = await getDataCollectionConsent();
      const patientId = consent === 'approved' ? await getOrCreateVisitorPatientId() : null;

      // Upload in background
      uploadSpeechRecordingRaw({
        fileUri: uri,
        mimeType: 'audio/m4a',
        fileName: `${activeStepId}.m4a`,
        stepType: activeStepType,
        sessionId: speechSessionId.current,
        patientId,
        durationMs,
      })
        .then((uploaded) => {
          setRecordedSteps((prev) => {
            const existing = prev[activeStepId];
            if (!existing) return prev;
            return {
              ...prev,
              [activeStepId]: { ...existing, storagePath: uploaded.storage_path },
            };
          });
        })
        .catch(() => {
          setRecordingError('Saved locally, but upload to server failed.');
        });
    } catch (err) {
      recordingRef.current = null;
      setRecordingError(err instanceof Error ? err.message : 'Recording failed.');
    }
  };

  const handleMarkStepDone = () => {
    if (!recordedSteps[currentStep.id]) {
      setStepValidationMsg('Please record this step before continuing.');
      return;
    }
    setStepValidationMsg(null);
    if (!completedStepIds.includes(currentStep.id)) {
      setCompletedStepIds((prev) => [...prev, currentStep.id]);
    }
    if (!isLastStep) {
      setCurrentStepIndex((prev) => prev + 1);
    }
  };

  const handleBackStep = () => {
    if (currentStepIndex === 0 || isRecording) return;
    setStepValidationMsg(null);
    setCurrentStepIndex((prev) => prev - 1);
  };

  if (permissionGranted === null) {
    return (
      <ScreenWrapper>
        <ActivityIndicator size="large" color="#1d4ed8" style={{ marginTop: 40 }} />
      </ScreenWrapper>
    );
  }

  if (!permissionGranted) {
    return (
      <ScreenWrapper>
        <Card>
          <Text style={styles.permissionTitle}>Microphone permission required</Text>
          <Text style={styles.permissionBody}>
            This test uses your microphone to record your voice. Please allow microphone access in
            your device settings and restart the app.
          </Text>
        </Card>
      </ScreenWrapper>
    );
  }

  const progressPct = Math.min(100, (elapsedMs / currentStep.maxDurationMs) * 100);
  const isWithinAcceptedRange =
    elapsedMs >= currentStep.minDurationMs && elapsedMs <= currentStep.maxDurationMs;
  const acceptedRangeLabel =
    currentStep.minDurationMs === currentStep.maxDurationMs
      ? `${(currentStep.minDurationMs / 1000).toFixed(0)}s`
      : `${(currentStep.minDurationMs / 1000).toFixed(0)}–${(currentStep.maxDurationMs / 1000).toFixed(0)}s`;

  return (
    <ScreenWrapper>
      <View style={styles.headerBlock}>
        <Text style={styles.title}>Standardized Speech Task</Text>
        <Text style={styles.subtitle}>
          Complete each step in order. Total expected duration is 30 to 60 seconds.
        </Text>
      </View>

      {!isTaskComplete ? (
        <Card>
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>{currentStep.title}</Text>
            <Text style={styles.progressLabel}>Progress {progressLabel}</Text>
          </View>

          <View style={styles.instructionBox}>
            <Text style={styles.instructionText}>{currentStep.instruction}</Text>
            <Text style={styles.durationText}>Target duration: {currentStep.durationLabel}</Text>
            <Text style={styles.promptText}>{currentStep.prompt}</Text>
          </View>

          <View style={styles.recordingSection}>
            <Text style={styles.sectionTitle}>Voice recording</Text>

            <View style={styles.progressBarWrap}>
              <View style={styles.progressMeta}>
                <Text style={styles.progressMetaLabel}>Recording progress</Text>
                <Text style={styles.progressMetaLabel}>
                  {(elapsedMs / 1000).toFixed(1)}s / {(currentStep.maxDurationMs / 1000).toFixed(0)}s
                </Text>
              </View>
              <Text style={[styles.acceptedRange, isWithinAcceptedRange && styles.acceptedRangeGood]}>
                Accepted range: {acceptedRangeLabel}
              </Text>
              <View style={styles.progressBarBg}>
                <View
                  style={[
                    styles.progressBarFill,
                    isWithinAcceptedRange && styles.progressBarFillGood,
                    { width: `${progressPct}%` },
                  ]}
                />
              </View>
            </View>

            {isRecording && (
              <Text style={styles.recordingIndicator}>● Recording in progress...</Text>
            )}

            <View style={styles.recBtnRow}>
              <TouchableOpacity
                style={[styles.recBtn, (isRecording || isTaskComplete) && styles.btnDisabled]}
                onPress={handleStartRecording}
                disabled={isRecording || isTaskComplete}
              >
                <Text style={styles.recBtnText}>
                  {hasCurrentRecording ? 'Record again' : 'Start recording'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.stopRecBtn, (!isRecording || isTaskComplete) && styles.btnDisabled]}
                onPress={handleStopRecording}
                disabled={!isRecording || isTaskComplete}
              >
                <Text style={styles.stopRecBtnText}>Stop recording</Text>
              </TouchableOpacity>
            </View>

            {recordedSteps[currentStep.id] && (
              <View style={styles.recordingInfo}>
                <Text style={styles.recordingInfoText}>
                  Recorded length:{' '}
                  {formatMs(recordedSteps[currentStep.id].durationMs)}
                </Text>
                <Text style={styles.recordingInfoText}>
                  Storage:{' '}
                  {recordedSteps[currentStep.id].storagePath ?? 'Uploading...'}
                </Text>
              </View>
            )}

            {recordingError && <Text style={styles.errorText}>{recordingError}</Text>}
          </View>

          <View style={styles.navRow}>
            <TouchableOpacity
              style={[styles.backBtn, (currentStepIndex === 0 || isRecording) && styles.btnDisabled]}
              onPress={handleBackStep}
              disabled={currentStepIndex === 0 || isRecording}
            >
              <Text style={styles.backBtnText}>Previous</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.nextBtn, (!hasCurrentRecording || isRecording) && styles.btnDisabled]}
              onPress={handleMarkStepDone}
              disabled={!hasCurrentRecording || isRecording}
            >
              <Text style={styles.nextBtnText}>{isLastStep ? 'Finish task' : 'Complete step'}</Text>
            </TouchableOpacity>
          </View>
          {stepValidationMsg && <Text style={styles.errorText}>{stepValidationMsg}</Text>}
        </Card>
      ) : (
        <Card>
          <Text style={styles.completedTitle}>Speech task completed</Text>
          <Text style={styles.completedBody}>
            Thank you. Your 3-step standardized speech recording has been submitted.
          </Text>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => router.push('/standard-tests')}
          >
            <Text style={styles.doneBtnText}>Back to Standard Tests</Text>
          </TouchableOpacity>
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
    fontSize: 22,
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
  stepHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  stepTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
    flex: 1,
  },
  progressLabel: {
    fontSize: 12,
    color: '#64748b',
  },
  instructionBox: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 4,
  },
  instructionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  durationText: {
    fontSize: 12,
    color: '#64748b',
  },
  promptText: {
    fontSize: 14,
    color: '#1e293b',
  },
  recordingSection: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
  },
  progressBarWrap: {
    gap: 4,
  },
  progressMeta: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  progressMetaLabel: {
    fontSize: 11,
    color: '#64748b',
  },
  acceptedRange: {
    fontSize: 11,
    color: '#64748b',
  },
  acceptedRangeGood: {
    color: '#16a34a',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: '#e2e8f0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 6,
    backgroundColor: '#1d4ed8',
    borderRadius: 3,
  },
  progressBarFillGood: {
    backgroundColor: '#16a34a',
  },
  recordingIndicator: {
    fontSize: 13,
    color: '#1d4ed8',
    fontWeight: '500',
  },
  recBtnRow: {
    flexDirection: 'row',
    gap: 8,
  },
  recBtn: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  recBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  stopRecBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  stopRecBtnText: { color: '#1e293b', fontWeight: '600', fontSize: 13 },
  btnDisabled: { opacity: 0.4 },
  recordingInfo: {
    gap: 2,
  },
  recordingInfoText: {
    fontSize: 12,
    color: '#64748b',
  },
  errorText: {
    fontSize: 13,
    color: '#92400e',
  },
  navRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  backBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  backBtnText: { color: '#1e293b', fontWeight: '600', fontSize: 13 },
  nextBtn: {
    flex: 1,
    backgroundColor: '#1d4ed8',
    paddingVertical: 10,
    borderRadius: 6,
    alignItems: 'center',
  },
  nextBtnText: { color: '#fff', fontWeight: '600', fontSize: 13 },
  completedTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1e293b',
    textAlign: 'center',
    marginBottom: 8,
  },
  completedBody: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 16,
  },
  doneBtn: {
    backgroundColor: '#1d4ed8',
    paddingVertical: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  doneBtnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
  permissionTitle: { fontSize: 16, fontWeight: '600', color: '#1e293b', marginBottom: 8 },
  permissionBody: { fontSize: 14, color: '#64748b' },
});
