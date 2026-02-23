import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { createFingerTapSession } from '../../lib/apiClient';

export function PatientFingerTappingTestStart() {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  const handleBeginTest = async () => {
    setIsStarting(true);
    setStartError(null);
    try {
      const response = await createFingerTapSession({
        test_type: 'FINGER_TAP',
        protocol_version: 'v1',
        patient_id: null,
        max_duration_ms: 15000,
        frames: [],
      });
      navigate(`/patient/standard-tests/finger-tapping/session?sessionId=${response.session_id}`);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Failed to start finger tapping test.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Finger tapping test</h1>
            <p className="text-text-muted text-base mt-2">
              This is the test start view. The guided tapping flow and backend processing will be wired
              next.
            </p>
          </div>

          <Card className="p-6 space-y-3">
            <h2 className="text-xl font-semibold text-text-main">Before you begin</h2>
            <p className="text-sm text-text-muted">
              Place your phone in a stable position and keep your hand clearly visible to the camera.
            </p>
            <button
              type="button"
              onClick={() => void handleBeginTest()}
              disabled={isStarting}
              className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60"
            >
              {isStarting ? 'Starting...' : 'Begin test'}
            </button>
            {startError && (
              <p className="text-sm text-amber-700">{startError}</p>
            )}
          </Card>
        </div>
      </div>
    </PatientLayout>
  );
}
