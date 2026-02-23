import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';

export function PatientFingerTappingTestSession() {
  const navigate = useNavigate();

  return (
    <PatientLayout>
      <div className="px-8 py-6">
        <div className="max-w-3xl mx-auto space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-text-main">Finger tapping in progress</h1>
            <p className="text-text-muted text-base mt-2">
              Stub view for active tapping capture. Backend integration can plug in here.
            </p>
          </div>

          <Card className="p-6 space-y-3">
            <h2 className="text-xl font-semibold text-text-main">Camera capture</h2>
            <p className="text-sm text-text-muted">
              Placeholder for camera preview, tap prompts, and tracking quality checks.
            </p>
            <button
              type="button"
              onClick={() => navigate('/patient/standard-tests')}
              className="rounded-sm border border-border-subtle bg-surface px-4 py-2 text-sm font-semibold text-text-main hover:border-brand-blue"
            >
              End stub session
            </button>
          </Card>
        </div>
      </div>
    </PatientLayout>
  );
}
