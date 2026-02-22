import { useState } from 'react';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';
import { PatientPromForm } from '../components/PatientPromForm';

/**
 * PatientDashboard - patient view showing personal overview and PROM assessments
 */
export function PatientDashboard() {
  const demoPatientId = 'b63028e5-22c8-4f12-804e-988ab3f30226';
  const [isCompleted, setIsCompleted] = useState(false);
  const [showForm, setShowForm] = useState(true);

  const statusLabel = isCompleted ? 'Completed' : 'Not completed';
  const statusStyles = isCompleted
    ? 'bg-green-100 text-green-800 border-green-200'
    : 'bg-amber-100 text-amber-800 border-amber-200';

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-8 text-center">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Welcome back</h1>
            <p className="text-text-muted text-base mt-2">
              Your daily report helps your care team keep your therapy on track.
            </p>
          </div>

          <Card className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="text-left md:text-left">
                <h2 className="text-xl font-semibold text-text-main">Daily Report</h2>
                <p className="text-text-muted text-sm">
                  Answer 10 short questions about today.
                </p>
              </div>
              <div className="flex justify-center md:justify-end">
                <span className={`px-3 py-1 rounded-full border text-sm font-semibold ${statusStyles}`}>
                  {statusLabel}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-6 text-left">
            <p className="text-sm text-text-muted font-semibold">Next checkup</p>
            <p className="text-lg text-text-main font-medium">Mar 12, 2026 at 10:30 AM</p>
          </Card>

          {isCompleted ? (
            <Card className="p-6">
              <h3 className="text-lg font-semibold text-text-main">Daily report completed</h3>
              <p className="text-text-muted text-sm mt-1">
                Thank you for checking in. Refresh the page to submit another report.
              </p>
            </Card>
          ) : (
            showForm && (
              <div>
                <h2 className="text-2xl font-bold text-text-main mb-4">Daily Report</h2>
                <PatientPromForm
                  patientId={demoPatientId}
                  onCompleted={() => {
                    setIsCompleted(true);
                    setShowForm(false);
                  }}
                />
              </div>
            )
          )}
        </div>
      </div>
    </PatientLayout>
  );
}
