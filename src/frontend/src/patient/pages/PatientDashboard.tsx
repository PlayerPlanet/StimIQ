import { useState } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { PatientPromForm } from '../components/PatientPromForm';
import { PatientPromHistory } from '../components/PatientPromHistory';

/**
 * PatientDashboard - patient view showing personal overview and PROM assessments
 */
export function PatientDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);

  return (
    <PatientLayout>
      <div className="px-8 py-6 space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-text-main">Your Overview</h1>
          <p className="text-text-muted text-base mt-2">Your DBS therapy information</p>
        </div>

        <Card className="p-6">
          <h2 className="text-lg font-semibold text-text-main mb-4">DBS Status</h2>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-text-muted font-semibold">Current Status</p>
              <p className="text-lg text-text-main font-medium">Active</p>
            </div>
            <div>
              <p className="text-sm text-text-muted font-semibold">Next Check-up</p>
              <p className="text-lg text-text-main font-medium">TBD</p>
            </div>
            <div>
              <p className="text-sm text-text-muted font-semibold">Last Adjustment</p>
              <p className="text-lg text-text-main font-medium">TBD</p>
            </div>
          </div>
        </Card>

        <div>
          <h2 className="text-2xl font-bold text-text-main mb-4">Daily Assessment</h2>
          <PatientPromForm onPatientIdChange={setSelectedPatientId} />
        </div>

        <div>
          <h2 className="text-2xl font-bold text-text-main mb-4">Past Assessments</h2>
          <PatientPromHistory patientId={selectedPatientId} />
        </div>
      </div>
    </PatientLayout>
  );
}
