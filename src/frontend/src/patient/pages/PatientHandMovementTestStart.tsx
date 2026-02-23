import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';

export function PatientHandMovementTestStart() {
  const navigate = useNavigate();

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
            <button
              type="button"
              onClick={() => navigate('/patient/standard-tests/hand-movement/session')}
              className="rounded-sm bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy"
            >
              Begin test
            </button>
          </Card>
        </div>
      </div>
    </PatientLayout>
  );
}
