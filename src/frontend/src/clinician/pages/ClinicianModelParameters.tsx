import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { LoadingState } from '../../components/common/LoadingState';
import type { ModelParameters } from '../../lib/mockData';
import { getModelParameters, updateModelParameters } from '../../lib/apiClient';
import { ModelParameterCard } from '../components/ModelParameterCard';

/**
 * ClinicianModelParameters - allows clinicians to view and adjust DBS model parameters
 */
export function ClinicianModelParameters() {
  const { patientId } = useParams();
  const navigate = useNavigate();
  const [parameters, setParameters] = useState<ModelParameters | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (patientId) {
          const data = await getModelParameters();
          setParameters(data);
        }
      } catch (error) {
        console.error('Failed to load parameters:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [patientId]);

  const handleUpdate = async (updated: Partial<ModelParameters>) => {
    if (!patientId) return;

    setIsSaving(true);
    try {
      const result = await updateModelParameters(updated);
      setParameters(result);
    } catch (error) {
      console.error('Failed to update parameters:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <ClinicianLayout>
      <div className="px-8 py-6">
        {/* Back button */}
        <button
          onClick={() => navigate(`/clinician/patient/${patientId}`)}
          className="px-4 py-2 text-brand-blue font-semibold hover:text-brand-navy transition-colors duration-200 mb-6"
        >
          ← Back to Patient Details
        </button>

        <h1 className="text-4xl font-bold font-heading text-text-main mb-8">
          DBS Model Parameters
        </h1>

        {isLoading ? (
          <LoadingState />
        ) : parameters ? (
          <div className="space-y-8">
            <ModelParameterCard
              parameters={parameters}
              isEditable={true}
              onUpdate={handleUpdate}
            />

            {isSaving && (
              <p className="text-sm text-brand-blue font-semibold">
                Saving changes...
              </p>
            )}

            {/* Info section */}
            <div className="bg-brand-blue-soft border border-border-subtle rounded-md p-6">
              <h3 className="font-semibold text-text-main mb-3">
                Demo Mode Notice
              </h3>
              <p className="text-sm text-text-muted">
                This is a demo interface. Parameter adjustments are shown for
                demonstration purposes only and do not affect actual DBS devices.
                In a production environment, these changes would be sent to the
                FastAPI backend for secure processing and device synchronization.
              </p>
            </div>
          </div>
        ) : (
          <p className="text-center text-text-secondary">
            Unable to load parameters.
          </p>
        )}
      </div>
    </ClinicianLayout>
  );
}
