import { useState } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { PatientPromForm } from '../components/PatientPromForm';

export function PatientDailyReport() {
  const demoPatientId = 'b63028e5-22c8-4f12-804e-988ab3f30226';
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
            <PatientPromForm
              patientId={demoPatientId}
              onCompleted={() => {
                setIsCompleted(true);
              }}
            />
          )}
        </div>
      </div>
    </PatientLayout>
  );
}
