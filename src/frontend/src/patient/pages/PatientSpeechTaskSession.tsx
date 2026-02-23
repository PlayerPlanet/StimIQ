import { useMemo, useState } from 'react';
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

export function PatientSpeechTaskSession() {
  const navigate = useNavigate();
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedStepIds, setCompletedStepIds] = useState<string[]>([]);

  const currentStep = SPEECH_STEPS[currentStepIndex];
  const isLastStep = currentStepIndex === SPEECH_STEPS.length - 1;
  const totalCompleted = completedStepIds.length;

  const progressLabel = useMemo(
    () => `${Math.min(totalCompleted + 1, SPEECH_STEPS.length)} / ${SPEECH_STEPS.length}`,
    [totalCompleted]
  );

  const handleMarkStepDone = () => {
    if (!completedStepIds.includes(currentStep.id)) {
      setCompletedStepIds((prev) => [...prev, currentStep.id]);
    }

    if (isLastStep) {
      return;
    }

    setCurrentStepIndex((prev) => prev + 1);
  };

  const handleBackStep = () => {
    if (currentStepIndex === 0) {
      return;
    }
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

            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleBackStep}
                disabled={currentStepIndex === 0 || isTaskComplete}
                className="rounded-sm border border-border-subtle px-4 py-2 text-sm font-semibold text-text-main disabled:opacity-50"
              >
                Previous
              </button>
              {!isTaskComplete && (
                <button
                  type="button"
                  onClick={handleMarkStepDone}
                  className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy"
                >
                  {isLastStep ? 'Finish task' : 'Complete step'}
                </button>
              )}
            </div>
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
