import { useNavigate } from 'react-router-dom';
import { PatientLayout } from '../../layouts/PatientLayout';
import { Card } from '../../components/common/Card';

export function PatientSpeechTaskStart() {
  const navigate = useNavigate();

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
            <button
              type="button"
              onClick={() => navigate('/patient/standard-tests/speech-task/session')}
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
