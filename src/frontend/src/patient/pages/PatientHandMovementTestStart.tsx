import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { createLineFollowSession } from '../../lib/apiClient';
import {
  getDataCollectionConsent,
  getOrCreateVisitorPatientId,
  setDataCollectionConsent,
  type DataCollectionConsent,
} from '../utils/visitorIdentity';

export function PatientHandMovementTestStart() {
  const navigate = useNavigate();
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [consent, setConsent] = useState<DataCollectionConsent | null>(() => getDataCollectionConsent());
  const visitorPatientId = consent === 'approved' ? getOrCreateVisitorPatientId() : null;

  const handleApprove = () => {
    setDataCollectionConsent('approved');
    setConsent('approved');
    setStartError(null);
  };

  const handleReject = () => {
    setDataCollectionConsent('rejected');
    setConsent('rejected');
    setStartError('Data collection is rejected. No test data will be sent.');
  };

  const handleBeginTest = async () => {
    if (consent !== 'approved') {
      setStartError('Approve data collection to start this test.');
      return;
    }

    setIsStarting(true);
    setStartError(null);
    try {
      const response = await createLineFollowSession({
        test_type: 'LINE_FOLLOW',
        protocol_version: 'v1',
        patient_id: visitorPatientId ?? null,
        p1: { x: 0.2, y: 0.75 },
        p2: { x: 0.8, y: 0.75 },
        end_radius: 0.05,
        corridor_radius: 0.03,
        max_duration_ms: 15000,
        frames: [],
      });
      navigate(`/patient/standard-tests/hand-movement/session?sessionId=${response.session_id}`);
    } catch (error) {
      setStartError(error instanceof Error ? error.message : 'Failed to start hand movement test.');
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Hand movement tracking test</h1>
            <p className="text-text-muted text-base mt-2">
              This is the test start view. The recording flow will be wired to backend hand tracking
              next.
            </p>
          </div>

          <Card className="p-6 space-y-3">
            <h2 className="text-xl font-semibold text-text-main">Before you begin</h2>
            <p className="text-sm text-text-muted">
              Place your phone in a stable position and keep your hand visible to the camera.
            </p>
            <div className="rounded-sm border border-border-subtle bg-surface-alt p-3 space-y-1">
              <p className="text-sm font-semibold text-text-main">Data collection note</p>
              <p className="text-xs text-text-muted">
                We generate a visitor patient ID and attach it to this test so your results can be
                saved across visits on this device.
              </p>
              <p className="text-xs text-text-muted">
                Status: {consent === 'approved' ? 'Approved' : consent === 'rejected' ? 'Rejected' : 'Not decided'}
              </p>
              <p className="text-xs text-text-muted">Visitor ID: {visitorPatientId ?? 'null'}</p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleApprove}
                  className="rounded-sm bg-brand-blue px-3 py-1 text-xs font-semibold text-white hover:bg-brand-navy"
                >
                  Approve
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  className="rounded-sm border border-border-subtle bg-surface px-3 py-1 text-xs font-semibold text-text-main hover:border-brand-blue"
                >
                  Reject
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => void handleBeginTest()}
              disabled={isStarting || consent !== 'approved'}
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
