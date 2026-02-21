import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';

/**
 * PatientDashboard - patient view showing personal overview
 * Note: No backend endpoint for patient-specific data yet
 */
export function PatientDashboard() {
  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-main">Your Overview</h1>
          <p className="text-text-muted text-base mt-2">
            Your DBS therapy information
          </p>
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
      </div>
    </PatientLayout>
  );
}
