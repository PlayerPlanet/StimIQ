import { useState } from 'react';
import type { Patient, CreatePatientRequest } from '../../lib/types';
import { createPatient } from '../../lib/apiClient';
import { Card } from '../../components/common/Card';
import { CollapsibleSection } from '../../components/common/CollapsibleSection';

interface CreatePatientModalProps {
  onSubmit: (patient: Patient) => void;
  onClose: () => void;
}

interface CreatePatientFormState extends CreatePatientRequest {
  dbs_device_model: string;
}

const DBS_DEVICE_OPTIONS = [
  'Medtronic Percept PC',
  'Medtronic Activa RC',
  'Boston Scientific Vercise Genus',
];

export function CreatePatientModal({ onSubmit, onClose }: CreatePatientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<CreatePatientFormState>({
    first_name: '',
    last_name: '',
    date_of_birth: null,
    notes: '',
    dbs_device_model: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'date_of_birth' ? (value || null) : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const payload: CreatePatientRequest = {
        first_name: formData.first_name,
        last_name: formData.last_name,
        date_of_birth: formData.date_of_birth || null,
        notes: formData.notes || '',
      };

      const newPatient = await createPatient(payload);
      onSubmit(newPatient);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid = formData.first_name && formData.last_name;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-surface rounded-sm border border-border-subtle p-4 max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-bold text-text-main mb-3 pb-2 border-b border-border-subtle">Create New Patient</h2>

        {error && (
          <div className="mb-3 p-2 bg-red-50 border border-red-200 text-red-700 text-xs rounded-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <CollapsibleSection title="Patient information" defaultOpen={true}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">First name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">Last name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                  required
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">Date of birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth || ''}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </div>
            </div>
          </CollapsibleSection>

          <Card className="p-3">
            <h3 className="text-sm font-semibold text-text-main mb-2">Clinical notes</h3>
            <textarea
              name="notes"
              value={formData.notes || ''}
              onChange={handleChange}
              placeholder="Diagnosis, relevant notes..."
              rows={4}
              className="w-full px-3 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            />
          </Card>

          <Card className="p-3">
            <h3 className="text-sm font-semibold text-text-main mb-2">DBS device</h3>
            <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">Device model</label>
            <select
              name="dbs_device_model"
              value={formData.dbs_device_model}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
            >
              <option value="">Select a DBS device</option>
              {DBS_DEVICE_OPTIONS.map((model) => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </Card>

          <div className="flex gap-3 justify-end pt-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-alt text-text-main border border-border-subtle rounded-sm hover:bg-surface disabled:opacity-50 text-sm font-semibold"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-brand-blue text-white rounded-sm hover:bg-brand-navy disabled:opacity-50 text-sm font-semibold"
              disabled={!isValid || isSubmitting}
            >
              {isSubmitting ? 'Creating...' : 'Create Patient'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
