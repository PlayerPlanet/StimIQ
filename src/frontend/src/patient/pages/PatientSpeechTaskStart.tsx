import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import {
  getDataCollectionConsent,
  getOrCreateVisitorPatientId,
  setDataCollectionConsent,
  type DataCollectionConsent,
} from '../utils/visitorIdentity';

export function PatientSpeechTaskStart() {
  const navigate = useNavigate();
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
    setStartError('Data collection is rejected. No voice recording data will be sent.');
  };

  const handleBeginTest = () => {
    if (consent !== 'approved') {
      setStartError('Approve data collection to start this test.');
      return;
    }
    navigate('/patient/standard-tests/speech-task/session');
  };

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Standardized speech task</h1>
            <p className="text-text-muted text-base mt-2">
              Complete a short 3-step voice task. The whole recording takes about 30 to 60 seconds.
            </p>
          </div>

          <Card className="p-6 space-y-4">
            <h2 className="text-xl font-semibold text-text-main">Before you begin</h2>
            <ul className="text-sm text-text-muted list-disc pl-5 space-y-1">
              <li>Use a quiet room and hold the phone close to your mouth.</li>
              <li>Speak at a comfortable volume and steady pace.</li>
              <li>Follow all three steps in order for comparable results.</li>
            </ul>
            <div className="rounded-sm border border-border-subtle bg-surface-alt p-3 space-y-1">
              <p className="text-sm font-semibold text-text-main">Data collection note</p>
              <p className="text-xs text-text-muted">
                We generate a visitor patient ID and attach it to this speech test so your results can
                be saved across visits on this device.
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
              onClick={handleBeginTest}
              disabled={consent !== 'approved'}
              className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-60"
            >
              Begin test
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
