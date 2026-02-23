import { useState } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { PatientPromForm } from '../components/PatientPromForm';
import { getOrCreateVisitorPatientId } from '../utils/visitorIdentity';

export function PatientDailyReport() {
  const visitorPatientId = getOrCreateVisitorPatientId();
  const [isCompleted, setIsCompleted] = useState(false);

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-text-main">Daily Report</h1>
            <p className="text-text-muted text-base mt-2">
              Share how you are feeling today in a short 10-question check-in.
            </p>
          </div>

          {isCompleted ? (
            <Card className="p-6 text-center">
              <h2 className="text-lg font-semibold text-text-main">Daily report completed</h2>
              <p className="text-text-muted text-sm mt-1">
                Thank you for checking in. Refresh the page to submit another report.
              </p>
            </Card>
          ) : (
            <>
              <Card className="p-4 space-y-1">
                <p className="text-sm font-semibold text-text-main">Data collection note</p>
                <p className="text-xs text-text-muted">
                  We use a generated visitor patient ID to link your daily reports and test results on
                  this device.
                </p>
                <p className="text-xs text-text-muted">Visitor ID: {visitorPatientId}</p>
              </Card>
              <PatientPromForm
                patientId={visitorPatientId}
                onCompleted={() => {
                  setIsCompleted(true);
                }}
              />
            </>
          )}
        </div>
      </div>
    </PatientLayout>
  );
}
