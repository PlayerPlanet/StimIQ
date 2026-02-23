import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';

interface SpeechStep {
  id: string;
  title: string;
  instruction: string;
  durationLabel: string;
  prompt: string;
}

interface SpeechRecording {
  url: string;
  durationMs: number;
}

const SPEECH_STEPS: SpeechStep[] = [
  {
    id: 'sustained-vowel',
    title: 'Step 1: Sustained vowel',
    instruction: 'Take a breath and hold "aaa" in one continuous sound.',
    durationLabel: '10 to 15 seconds',
    prompt: 'Say: "aaaaaaaaaa..."',
  },
  {
    id: 'standardized-sentence',
    title: 'Step 2: Standardized sentence',
    instruction: 'Read the fixed sentence clearly at a natural speaking pace.',
    durationLabel: 'About 5 to 10 seconds',
    prompt: 'Sentence: "Today is a bright and calm day."',
  },
  {
    id: 'rapid-syllable',
    title: 'Step 3: Rapid syllable repetition',
    instruction: 'Repeat "pa-ta-ka" as quickly and clearly as possible.',
    durationLabel: '10 seconds',
    prompt: 'Say repeatedly: "pa-ta-ka, pa-ta-ka, pa-ta-ka..."',
  },
];

function formatDurationMs(durationMs: number): string {
  const seconds = Math.max(0, Math.round(durationMs / 1000));
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
}

export function PatientSpeechTaskSession() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);
  const [recordings, setRecordings] = useState<Record<string, SpeechRecording>>({});
  const [recordingStepId, setRecordingStepId] = useState<string | null>(null);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [stepValidationMsg, setStepValidationMsg] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingStartedAtRef = useRef<number | null>(null);
  const recordingsRef = useRef<Record<string, SpeechRecording>>({});

  const currentStep = SPEECH_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === SPEECH_STEPS.length - 1;
  const totalCompleted = completedStepIds.length;
  const hasCurrentStepRecording = Boolean(recordings[currentStep.id]);

  const progressLabel = useMemo(
    () => `${Math.min(totalCompleted + 1, SPEECH_STEPS.length)} / ${SPEECH_STEPS.length}`,
    [totalCompleted]
  );

  useEffect(() => {
    recordingsRef.current = recordings;
  }, [recordings]);

  useEffect(
    () => () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      }
      Object.values(recordingsRef.current).forEach((recording) => {
        URL.revokeObjectURL(recording.url);
      });
    },
    []
  );

  const cleanupRecorderResources = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    mediaRecorderRef.current = null;
    audioChunksRef.current = [];
    recordingStartedAtRef.current = null;
  };

  const handleStartRecording = async () => {
    if (recordingStepId) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setRecordingError('Audio recording is not supported in this browser.');
      return;
    }

    setRecordingError(null);
    setStepValidationMsg(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];
      recordingStartedAtRef.current = Date.now();
      setRecordingStepId(currentStep.id);

      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const mimeType = recorder.mimeType || 'audio/webm';
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const durationMs = Math.max(
          0,
          Date.now() - (recordingStartedAtRef.current ?? Date.now())
        );
        const url = URL.createObjectURL(blob);

        setRecordings((prev) => {
          const existingRecording = prev[currentStep.id];
          if (existingRecording) {
            URL.revokeObjectURL(existingRecording.url);
          }
          return {
            ...prev,
            [currentStep.id]: {
              url,
              durationMs,
            },
          };
        });

        setRecordingStepId(null);
        cleanupRecorderResources();
      };

      recorder.onerror = () => {
        setRecordingError('Microphone recording failed. Please try again.');
        setRecordingStepId(null);
        cleanupRecorderResources();
      };

      recorder.start();
    } catch {
      setRecordingError('Could not access microphone. Please allow microphone permission.');
      setRecordingStepId(null);
      cleanupRecorderResources();
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleMarkStepDone = () => {
    if (!recordings[currentStep.id]) {
      setStepValidationMsg('Please record this step before continuing.');
      return;
    }

    setStepValidationMsg(null);

    if (!completedStepIds.includes(currentStep.id)) {
      setCompletedStepIds((prev) => [...prev, currentStep.id]);
    }

    if (isLastStep) {
      return;
    }

    setCurrentStepIndex((prev) => prev + 1);
  };

  const handleBackStep = () => {
    if (currentStepIndex === 0 || recordingStepId) {
      return;
    }
    setStepValidationMsg(null);
    setCurrentStepIndex((prev) => prev - 1);
  };

  const isTaskComplete = totalCompleted === SPEECH_STEPS.length;

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Standardized speech task</h1>
            <p className="text-text-muted text-base mt-2">
              Complete each step in order. Total expected duration is 30 to 60 seconds.
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-text-main">{currentStep.title}</h2>
              <span className="text-sm text-text-muted">Progress {progressLabel}</span>
            </div>

            <div className="rounded-sm border border-border-subtle bg-surface-alt p-4 space-y-2">
              <p className="text-sm font-semibold text-text-main">{currentStep.instruction}</p>
              <p className="text-sm text-text-muted">Target duration: {currentStep.durationLabel}</p>
              <p className="text-sm text-text-main">{currentStep.prompt}</p>
            </div>

            <div className="rounded-sm border border-border-subtle p-4 space-y-3">
              <h3 className="text-sm font-semibold text-text-main">Voice recording</h3>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleStartRecording()}
                  disabled={recordingStepId !== null || isTaskComplete}
                  className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
                >
                  {hasCurrentStepRecording ? 'Record again' : 'Start recording'}
                </button>
                <button
                  type="button"
                  onClick={handleStopRecording}
                  disabled={recordingStepId !== currentStep.id || isTaskComplete}
                  className="rounded-sm border border-border-subtle px-4 py-2 text-sm font-semibold text-text-main disabled:opacity-50"
                >
                  Stop recording
                </button>
              </div>

              {recordingStepId === currentStep.id && (
                <p className="text-sm text-brand-blue">Recording in progress...</p>
              )}

              {recordings[currentStep.id] && (
                <div className="space-y-2">
                  <p className="text-sm text-text-muted">
                    Recorded length: {formatDurationMs(recordings[currentStep.id].durationMs)}
                  </p>
                  <audio controls src={recordings[currentStep.id].url} className="w-full">
                    <track kind="captions" />
                  </audio>
                </div>
              )}

              {recordingError && <p className="text-sm text-amber-700">{recordingError}</p>}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackStep}
                disabled={currentStepIndex === 0 || isTaskComplete || recordingStepId !== null}
                className="rounded-sm border border-border-subtle px-4 py-2 text-sm font-semibold text-text-main disabled:opacity-50"
              >
                Previous
              </button>
              {!isTaskComplete && (
                <button
                  type="button"
                  onClick={handleMarkStepDone}
                  disabled={!hasCurrentStepRecording || recordingStepId === currentStep.id}
                  className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
                >
                  {isLastStep ? 'Finish task' : 'Complete step'}
                </button>
              )}
            </div>
            {stepValidationMsg && <p className="text-sm text-amber-700">{stepValidationMsg}</p>}
          </Card>

          {isTaskComplete && (
            <Card className="p-6 space-y-3">
              <h2 className="text-lg font-semibold text-text-main">Speech task completed</h2>
              <p className="text-sm text-text-muted">
                Thank you. Your 3-step standardized speech recording has been completed.
              </p>
              <button
                type="button"
                onClick={() => navigate('/patient/standard-tests')}
                className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy"
              >
                Back to standard tests
              </button>
            </Card>
          )}
        </div>
      </div>
    </PatientLayout>
  );
}
