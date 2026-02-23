import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { Modal } from '../../components/common/Modal';

type TestKey = 'finger-tapping' | 'hand-movement' | 'speech-task' | 'walking-test';

interface TestCardConfig {
  key: TestKey;
  title: string;
  shortDescription: string;
  modalTitle: string;
  imageSrc: string;
  imageAlt: string;
  valueNow: string;
  previousBarrier: string;
  futureStory: string;
}

const STANDARD_TESTS: TestCardConfig[] = [
  {
    key: 'finger-tapping',
    title: 'Finger Tapping Test (MDS-UPDRS)',
    shortDescription: 'A short at-home tapping task provides dense, comparable data points.',
    modalTitle: 'Finger Tapping Test (MDS-UPDRS)',
    imageSrc: '/assets/standard-tests/finger.png',
    imageAlt: 'Patient performing a finger tapping test on a smartphone',
    valueNow:
      'Instead of one clinic snapshot, we get weekly or daily motor profiles that improve personalized scoring accuracy.',
    previousBarrier:
      'Previously, the test depended on clinical settings, standardized in-person instructions, and manual documentation, which limited repeatability at home.',
    futureStory:
      'StimIQ guides each step, enforces consistent execution, and feeds results directly into the model so even subtle trends are detected early.',
  },
  {
    key: 'hand-movement',
    title: 'Hand Movement Tracking (Video Analysis)',
    shortDescription: 'Motion features extracted from phone video add objective detail to symptom tracking.',
    modalTitle: 'Hand Movement Tracking (Video Analysis)',
    imageSrc: '/assets/standard-tests/hand.png',
    imageAlt: 'Phone camera recording guided hand movement for analysis',
    valueNow:
      'Video analysis captures changes in speed, amplitude, and smoothness, making scores less subjective.',
    previousBarrier:
      'High-quality movement analysis used to require specialized hardware, lab environments, and slow manual post-processing.',
    futureStory:
      'A short standardized clip from a home camera can now be scored automatically, so clinicians see trends instead of isolated observations.',
  },
  {
    key: 'speech-task',
    title: 'Standardized Speech Task (Prosodic Feature Analysis)',
    shortDescription: 'A standardized speech task turns voice changes into measurable biomarkers.',
    modalTitle: 'Standardized Speech Task',
    imageSrc: '/assets/standard-tests/audio.png',
    imageAlt: 'Patient speaking into a phone microphone during a guided speech task',
    valueNow:
      'Prosodic feature analysis reveals subtle changes that patients or clinicians may miss during normal conversation.',
    previousBarrier:
      'Speech data was often collected inconsistently, recordings were hard to compare, and analysis required specialist expertise.',
    futureStory:
      'When the same speech task is repeated with the same structure, the system can track long-term changes and combine them with other measures.',
  },
  {
    key: 'walking-test',
    title: 'Walking Test',
    shortDescription: 'Daily walking becomes a continuous signal of mobility variation.',
    modalTitle: 'Walking Test',
    imageSrc: '/assets/standard-tests/pose.png',
    imageAlt: 'Patient walking at home during a standardized walking assessment',
    valueNow:
      'Gait rhythm, step length, and stability help detect functional changes earlier than occasional clinic assessments.',
    previousBarrier:
      'Traditional gait assessment relied on infrequent observations, often in clinical environments that do not reflect daily life.',
    futureStory:
      'A standardized at-home walking test provides longitudinal, real-world data that improves treatment optimization and safety.',
  },
];

export function PatientStandardTests() {
  const navigate = useNavigate();
  const [activeTest, setActiveTest] = useState<TestCardConfig | null>(null);

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-6xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Standard tests</h1>
            <p className="text-text-muted text-base mt-2">
              The goal is to make standardized tests a seamless part of your at-home care journey.
            </p>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-5 gap-4">
            <Card className="p-5 xl:col-span-3">
              <p className="text-xs uppercase tracking-wide text-text-muted font-semibold">
                Prediction timeline
              </p>
              <h2 className="text-xl font-semibold text-text-main mt-2">
                Patient data improves predictions over time
              </h2>
              <p className="text-sm text-text-muted mt-2">
                The more often standardized tests are repeated, the better the model learns personal
                patterns and separates real change from daily noise.
              </p>
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-sm border border-border-subtle bg-surface-alt p-3">
                  <p className="text-xs text-text-muted">Month 1</p>
                  <p className="text-sm font-semibold text-text-main mt-1">Baseline</p>
                </div>
                <div className="rounded-sm border border-border-subtle bg-surface-alt p-3">
                  <p className="text-xs text-text-muted">Month 3</p>
                  <p className="text-sm font-semibold text-text-main mt-1">Trends become visible</p>
                </div>
                <div className="rounded-sm border border-border-subtle bg-surface-alt p-3">
                  <p className="text-xs text-text-muted">Month 6+</p>
                  <p className="text-sm font-semibold text-text-main mt-1">Prediction accuracy improves</p>
                </div>
              </div>
            </Card>

            <Card className="p-5 xl:col-span-2 flex flex-col">
              <p className="text-xs uppercase tracking-wide text-text-muted font-semibold">
                Clinician message
              </p>
              <h2 className="text-lg font-semibold text-text-main mt-2">Message from your care team</h2>
              <p className="text-sm text-text-muted mt-3 leading-relaxed">
                "Great work staying consistent with your tests. Every at-home measurement helps us
                tune your treatment more precisely for you."
              </p>
              <p className="text-xs text-text-muted mt-4">Dr. Lehtinen, Neurologist</p>
            </Card>
          </div>

          <div>
            <h2 className="text-xl font-semibold text-text-main">Test cards</h2>
            <p className="text-sm text-text-muted mt-1">
              Open a card to see how each test improves future scoring.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {STANDARD_TESTS.map((test) => (
              <Card
                key={test.key}
                hover
                onClick={() => setActiveTest(test)}
                className="p-5 cursor-pointer min-h-[220px] flex flex-col"
              >
                <div className="rounded-sm border border-border-subtle bg-surface-alt h-28 overflow-hidden">
                  <img
                    src={test.imageSrc}
                    alt={test.imageAlt}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                </div>
                <h3 className="text-lg font-semibold text-text-main mt-4">{test.title}</h3>
                <p className="text-sm text-text-muted mt-2 flex-1">{test.shortDescription}</p>
                <p className="text-xs text-brand-blue mt-3 font-semibold">Click to open the story</p>
              </Card>
            ))}
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(activeTest)}
        onClose={() => setActiveTest(null)}
        title={activeTest?.modalTitle ?? 'Standard tests'}
        size="lg"
      >
        {activeTest && (
          <div className="space-y-4">
            <div className="rounded-sm border border-border-subtle bg-surface-alt overflow-hidden">
              <img
                src={activeTest.imageSrc}
                alt={activeTest.imageAlt}
                className="h-56 w-full object-cover"
              />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main">Why does this improve scoring?</h3>
              <p className="text-sm text-text-muted mt-1">{activeTest.valueNow}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main">Why was this not done at home before?</h3>
              <p className="text-sm text-text-muted mt-1">{activeTest.previousBarrier}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold text-text-main">What does the future look like?</h3>
              <p className="text-sm text-text-muted mt-1">{activeTest.futureStory}</p>
            </div>
            {(activeTest.key === 'hand-movement' ||
              activeTest.key === 'finger-tapping' ||
              activeTest.key === 'speech-task') && (
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTest(null);
                    const destination =
                      activeTest.key === 'hand-movement'
                        ? '/patient/standard-tests/hand-movement/start'
                        : activeTest.key === 'finger-tapping'
                          ? '/patient/standard-tests/finger-tapping/start'
                          : '/patient/standard-tests/speech-task/start';
                    navigate(destination);
                  }}
                  className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy"
                >
                  Start test now
                </button>
              </div>
            )}
          </div>
        )}
      </Modal>

    </PatientLayout>
  );
}
