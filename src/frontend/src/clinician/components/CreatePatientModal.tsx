import { useState } from 'react';
import type { Patient, CreatePatientRequest } from '../../lib/types';
import { createPatient } from '../../lib/apiClient';
import { Card } from '../../components/common/Card';
import { CollapsibleSection } from '../../components/common/CollapsibleSection';
import { TREATMENT_GOAL_PRESETS } from '../../lib/types';

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
    treatment_w_speech: 0.0,
    treatment_non_motor_diary_ratio: 0.5,
    treatment_goals_notes: '',
  });

  // Lock state for each weight
  const [lockedWeights, setLockedWeights] = useState({
    motor: false,
    non_motor: false,
    duration: false,
    speech: false,
  });

  type WeightKey = 'motor' | 'non_motor' | 'duration' | 'speech';

  const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  const toggleLock = (type: WeightKey) => {
    setLockedWeights((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleWeightChange = (type: WeightKey, value: number) => {
    // value is percentage (0-100)
    const currentPercentages = {
      motor: Math.round((formData.treatment_w_motor ?? 0.33) * 100),
      non_motor: Math.round((formData.treatment_w_non_motor ?? 0.33) * 100),
      duration: Math.round((formData.treatment_w_duration ?? 0.34) * 100),
      speech: Math.round((formData.treatment_w_speech ?? 0.0) * 100),
    };

    // Calculate locked total (excluding the one being changed)
    let lockedTotal = 0;
    let unlockedWeights: WeightKey[] = [];
    const allWeights: WeightKey[] = ['motor', 'non_motor', 'duration', 'speech'];

    allWeights.forEach((w) => {
      if (lockedWeights[w] && w !== type) {
        lockedTotal += currentPercentages[w];
      } else if (!lockedWeights[w] && w !== type) {
        unlockedWeights.push(w);
      }
    });

    const available = 100 - lockedTotal;
    const adjustedPercent = clampPercent(Math.min(value, available));
    const remaining = available - adjustedPercent;
    const perOther = unlockedWeights.length > 0 ? clampPercent(remaining / unlockedWeights.length) : 0;

    // Update form data with new values
    const newFormData = { ...formData };
    if (type === 'motor') newFormData.treatment_w_motor = adjustedPercent / 100;
    else if (type === 'non_motor') newFormData.treatment_w_non_motor = adjustedPercent / 100;
    else if (type === 'duration') newFormData.treatment_w_duration = adjustedPercent / 100;
    else if (type === 'speech') newFormData.treatment_w_speech = adjustedPercent / 100;

    // Update other unlocked weights
    unlockedWeights.forEach((w) => {
      if (w === 'motor') newFormData.treatment_w_motor = perOther / 100;
      else if (w === 'non_motor') newFormData.treatment_w_non_motor = perOther / 100;
      else if (w === 'duration') newFormData.treatment_w_duration = perOther / 100;
      else if (w === 'speech') newFormData.treatment_w_speech = perOther / 100;
    });

    setFormData(newFormData);
  };

  const handlePresetClick = (presetName: string) => {
    const preset = TREATMENT_GOAL_PRESETS.find((p) => p.name === presetName);
    if (!preset) return;
    setFormData((prev) => ({
      ...prev,
      treatment_w_motor: preset.w_motor,
      treatment_w_non_motor: preset.w_non_motor,
      treatment_w_duration: preset.w_duration,
      treatment_w_speech: preset.w_speech,
      treatment_non_motor_diary_ratio: preset.non_motor_diary_ratio,
    }));
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
        payload.treatment_w_speech = formData.treatment_w_speech ?? 0.0;
        payload.treatment_non_motor_diary_ratio = formData.treatment_non_motor_diary_ratio ?? 0.5;
        payload.treatment_goals_notes = formData.treatment_goals_notes || null;
      } else {
        payload.treatment_w_motor = null;
        payload.treatment_w_non_motor = null;
        payload.treatment_w_duration = null;
        payload.treatment_w_speech = null;
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
              These weights control how severity components are combined. Higher = more emphasis on that component.
            </p>

            <div className={`space-y-3 ${formData.treatment_goals_enabled ? '' : 'opacity-50 pointer-events-none'}`}>
              <div className="mb-3">
                <label className="text-xs font-semibold text-text-main block mb-2">Quick Presets</label>
                <div className="flex flex-wrap gap-2">
                  {TREATMENT_GOAL_PRESETS.map((preset) => (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handlePresetClick(preset.name)}
                      className="px-3 py-1 text-xs font-semibold rounded-sm border-2 transition-all duration-150 bg-surface text-text-main border-border-subtle hover:border-brand-blue hover:bg-brand-blue-soft"
                      title={preset.description}
                    >
                      {preset.name === 'default' && '⚖️ Balanced'}
                      {preset.name === 'motor_focused' && '🎯 Motor'}
                      {preset.name === 'quality_of_life_focused' && '💚 QoL'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Motor symptoms (IMU)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((formData.treatment_w_motor ?? 0.33) * 100)}
                      onChange={(e) => handleWeightChange('motor', Number(e.target.value))}
                      disabled={lockedWeights.motor}
                      className="w-14 rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-main font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="Motor symptoms weight percent"
                    />
                    <span className="text-xs text-text-muted">%</span>
                    <button
                      type="button"
                      onClick={() => toggleLock('motor')}
                      className="ml-1 px-1.5 py-0.5 text-xs rounded-sm border border-border-subtle hover:border-brand-blue transition-colors"
                      title={lockedWeights.motor ? 'Unlock to adjust' : 'Lock to prevent changes'}
                    >
                      {lockedWeights.motor ? '🔒' : '🔓'}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">Wearable IMU features: tremor (3–7 Hz), bradykinesia, amplitude.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Non-motor symptoms</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((formData.treatment_w_non_motor ?? 0.33) * 100)}
                      onChange={(e) => handleWeightChange('non_motor', Number(e.target.value))}
                      disabled={lockedWeights.non_motor}
                      className="w-14 rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-main font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="Non-motor symptoms weight percent"
                    />
                    <span className="text-xs text-text-muted">%</span>
                    <button
                      type="button"
                      onClick={() => toggleLock('non_motor')}
                      className="ml-1 px-1.5 py-0.5 text-xs rounded-sm border border-border-subtle hover:border-brand-blue transition-colors"
                      title={lockedWeights.non_motor ? 'Unlock to adjust' : 'Lock to prevent changes'}
                    >
                      {lockedWeights.non_motor ? '🔒' : '🔓'}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">PROMs &amp; standardized tests (mood, sleep, fatigue, etc.).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Disease duration</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((formData.treatment_w_duration ?? 0.34) * 100)}
                      onChange={(e) => handleWeightChange('duration', Number(e.target.value))}
                      disabled={lockedWeights.duration}
                      className="w-14 rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-main font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="Disease duration weight percent"
                    />
                    <span className="text-xs text-text-muted">%</span>
                    <button
                      type="button"
                      onClick={() => toggleLock('duration')}
                      className="ml-1 px-1.5 py-0.5 text-xs rounded-sm border border-border-subtle hover:border-brand-blue transition-colors"
                      title={lockedWeights.duration ? 'Unlock to adjust' : 'Lock to prevent changes'}
                    >
                      {lockedWeights.duration ? '🔒' : '🔓'}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">Years since diagnosis (normalized 0–30+ years).</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-text-main mb-1">Speaking ability</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={100}
                      step={1}
                      value={Math.round((formData.treatment_w_speech ?? 0.0) * 100)}
                      onChange={(e) => handleWeightChange('speech', Number(e.target.value))}
                      disabled={lockedWeights.speech}
                      className="w-14 rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-main font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:opacity-60 disabled:cursor-not-allowed"
                      aria-label="Speaking ability weight percent"
                    />
                    <span className="text-xs text-text-muted">%</span>
                    <button
                      type="button"
                      onClick={() => toggleLock('speech')}
                      className="ml-1 px-1.5 py-0.5 text-xs rounded-sm border border-border-subtle hover:border-brand-blue transition-colors"
                      title={lockedWeights.speech ? 'Unlock to adjust' : 'Lock to prevent changes'}
                    >
                      {lockedWeights.speech ? '🔒' : '🔓'}
                    </button>
                  </div>
                  <p className="mt-0.5 text-[10px] text-text-muted">Speech task severity (placeholder, not yet in loss).</p>
                </div>
              </div>

              <div className="pt-2 border-t border-border-subtle">
                <label className="block text-xs font-semibold text-text-main mb-1">Non-motor diary split</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step={1}
                    value={Math.round((formData.treatment_non_motor_diary_ratio ?? 0.5) * 100)}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        treatment_non_motor_diary_ratio: Math.max(0, Math.min(1, Number(e.target.value) / 100)),
                      }))
                    }
                    className="w-14 rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-main font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  />
                  <span className="text-xs text-text-muted">% diary (0=tests, 100=diary)</span>
                </div>
                <p className="mt-0.5 text-[10px] text-text-muted">Balance between standardized tests and patient diary entries.</p>
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
