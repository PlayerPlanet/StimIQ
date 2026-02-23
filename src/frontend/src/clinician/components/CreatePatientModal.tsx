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
  treatment_goals_enabled: boolean;
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
    treatment_goals_enabled: false,
    treatment_w_motor: 0.33,
    treatment_w_non_motor: 0.33,
    treatment_w_duration: 0.34,
    treatment_non_motor_diary_ratio: 0.5,
    treatment_goals_notes: '',
  });

  const handleWeightChange = (type: 'motor' | 'non_motor' | 'duration', value: number) => {
    const v = Math.max(0, Math.min(1, value));
    if (type === 'motor') {
      const remaining = 1 - v;
      const nonMotorRatio = (formData.treatment_w_non_motor || 0) / ((formData.treatment_w_non_motor || 0) + (formData.treatment_w_duration || 0) || 1);
      const nextNonMotor = Number((remaining * nonMotorRatio).toFixed(4));
      const nextDuration = Number((1 - v - nextNonMotor).toFixed(4));
      setFormData((prev) => ({
        ...prev,
        treatment_w_motor: v,
        treatment_w_non_motor: nextNonMotor,
        treatment_w_duration: nextDuration,
      }));
    } else if (type === 'non_motor') {
      const remaining = 1 - v;
      const motorRatio = (formData.treatment_w_motor || 0) / ((formData.treatment_w_motor || 0) + (formData.treatment_w_duration || 0) || 1);
      const nextMotor = Number((remaining * motorRatio).toFixed(4));
      const nextDuration = Number((1 - v - nextMotor).toFixed(4));
      setFormData((prev) => ({
        ...prev,
        treatment_w_motor: nextMotor,
        treatment_w_non_motor: v,
        treatment_w_duration: nextDuration,
      }));
    } else {
      const remaining = 1 - v;
      const motorRatio = (formData.treatment_w_motor || 0) / ((formData.treatment_w_motor || 0) + (formData.treatment_w_non_motor || 0) || 1);
      const nextMotor = Number((remaining * motorRatio).toFixed(4));
      const nextNonMotor = Number((1 - v - nextMotor).toFixed(4));
      setFormData((prev) => ({
        ...prev,
        treatment_w_motor: nextMotor,
        treatment_w_non_motor: nextNonMotor,
        treatment_w_duration: v,
      }));
    }
  };

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

      if (formData.treatment_goals_enabled) {
        payload.treatment_w_motor = formData.treatment_w_motor ?? 0.33;
        payload.treatment_w_non_motor = formData.treatment_w_non_motor ?? 0.33;
        payload.treatment_w_duration = formData.treatment_w_duration ?? 0.34;
        payload.treatment_non_motor_diary_ratio = formData.treatment_non_motor_diary_ratio ?? 0.5;
        payload.treatment_goals_notes = formData.treatment_goals_notes || null;
      } else {
        payload.treatment_w_motor = null;
        payload.treatment_w_non_motor = null;
        payload.treatment_w_duration = null;
        payload.treatment_non_motor_diary_ratio = null;
        payload.treatment_goals_notes = null;
      }

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

          <Card className="p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-text-main">Treatment goals</h3>
              <label className="flex items-center gap-2 text-xs text-text-muted">
                <input
                  type="checkbox"
                  checked={formData.treatment_goals_enabled}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      treatment_goals_enabled: e.target.checked,
                    }))
                  }
                />
                Set goals now
              </label>
            </div>

            <p className="text-xs text-text-muted mb-3">
              These weights shape how severity components are combined during optimization.
              Leave unchecked to keep defaults (can be set later).
            </p>

            <div className={`space-y-3 ${formData.treatment_goals_enabled ? '' : 'opacity-50 pointer-events-none'}`}>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-main">Motor severity (IMU)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-blue font-bold">
                      {Math.round((formData.treatment_w_motor ?? 0.33) * 100)}%
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((formData.treatment_w_motor ?? 0.33) * 100)}
                      onChange={(e) => handleWeightChange('motor', Number(e.target.value) / 100)}
                      className="w-16 rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      aria-label="Motor severity weight percent"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.treatment_w_motor ?? 0.33}
                  onChange={(e) => handleWeightChange('motor', parseFloat(e.target.value))}
                  className="w-full accent-brand-blue"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-main">Non-motor severity</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-blue font-bold">
                      {Math.round((formData.treatment_w_non_motor ?? 0.33) * 100)}%
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((formData.treatment_w_non_motor ?? 0.33) * 100)}
                      onChange={(e) => handleWeightChange('non_motor', Number(e.target.value) / 100)}
                      className="w-16 rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      aria-label="Non-motor severity weight percent"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.treatment_w_non_motor ?? 0.33}
                  onChange={(e) => handleWeightChange('non_motor', parseFloat(e.target.value))}
                  className="w-full accent-brand-blue"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-main">Non-motor diary split</label>
                  <span className="text-xs text-brand-blue font-bold">
                    {Math.round((formData.treatment_non_motor_diary_ratio ?? 0.5) * 100)}% diary
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.treatment_non_motor_diary_ratio ?? 0.5}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      treatment_non_motor_diary_ratio: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-brand-blue"
                />
                <p className="mt-1 text-[11px] text-text-muted">0% = only standard tests, 100% = only patient diary.</p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-main">Disease duration</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-brand-blue font-bold">
                      {Math.round((formData.treatment_w_duration ?? 0.34) * 100)}%
                    </span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((formData.treatment_w_duration ?? 0.34) * 100)}
                      onChange={(e) => handleWeightChange('duration', Number(e.target.value) / 100)}
                      className="w-16 rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                      aria-label="Disease duration weight percent"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.treatment_w_duration ?? 0.34}
                  onChange={(e) => handleWeightChange('duration', parseFloat(e.target.value))}
                  className="w-full accent-brand-blue"
                />
              </div>

              <div className="opacity-60">
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-text-main">Speech (Coming soon)</label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-text-muted font-bold">--</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={0}
                      disabled
                      className="w-16 rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-main"
                      aria-label="Speech weight percent"
                    />
                  </div>
                </div>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={0}
                  disabled
                  className="w-full accent-brand-blue"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">Notes (optional)</label>
                <textarea
                  name="treatment_goals_notes"
                  value={formData.treatment_goals_notes || ''}
                  onChange={handleChange}
                  rows={2}
                  placeholder="e.g., prioritize QoL over motor symptoms"
                  className="w-full px-3 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
                />
              </div>
            </div>
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
