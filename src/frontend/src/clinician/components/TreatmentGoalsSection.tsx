import { useState, useEffect } from 'react';
import { useTreatmentGoals } from '../useTreatmentGoals';
import { Card } from '../../components/common/Card';
import { LoadingState } from '../../components/common/LoadingState';
import { TREATMENT_GOAL_PRESETS } from '../../lib/types';

interface TreatmentGoalsSectionProps {
  patientId: string;
}

/**
 * TreatmentGoalsSection - Configure patient-specific severity weighting
 */
export function TreatmentGoalsSection({ patientId }: TreatmentGoalsSectionProps) {
  const { data, loading, error, updateGoals, updating } = useTreatmentGoals(patientId);
  
  // Local state for weight sliders (as percentages 0-100)
  const [motorWeight, setMotorWeight] = useState(33);
  const [nonMotorWeight, setNonMotorWeight] = useState(33);
  const [durationWeight, setDurationWeight] = useState(34);
  const [nonMotorDiaryRatio, setNonMotorDiaryRatio] = useState(50);
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Initialize from fetched data
  useEffect(() => {
    if (data) {
      const defaultPreset = TREATMENT_GOAL_PRESETS[0];
      const wMotor = data.w_motor ?? defaultPreset.w_motor;
      const wNonMotor = data.w_non_motor ?? defaultPreset.w_non_motor;
      const wDuration = data.w_duration ?? defaultPreset.w_duration;
      const diaryRatio = data.non_motor_diary_ratio ?? defaultPreset.non_motor_diary_ratio;

      setMotorWeight(Math.round(wMotor * 100));
      setNonMotorWeight(Math.round(wNonMotor * 100));
      setDurationWeight(Math.round(wDuration * 100));
      setNonMotorDiaryRatio(Math.round(diaryRatio * 100));
      setNotes(data.notes || '');
      setHasChanges(false);
    }
  }, [data]);

  // Auto-normalize weights to sum to 100
  const handleWeightChange = (
    type: 'motor' | 'non_motor' | 'duration',
    newValue: number
  ) => {
    const value = Math.max(0, Math.min(100, newValue));
    
    if (type === 'motor') {
      const remaining = 100 - value;
      const nonMotorRatio = nonMotorWeight / (nonMotorWeight + durationWeight || 1);
      setMotorWeight(value);
      setNonMotorWeight(Math.round(remaining * nonMotorRatio));
      setDurationWeight(100 - value - Math.round(remaining * nonMotorRatio));
    } else if (type === 'non_motor') {
      const remaining = 100 - value;
      const motorRatio = motorWeight / (motorWeight + durationWeight || 1);
      setNonMotorWeight(value);
      setMotorWeight(Math.round(remaining * motorRatio));
      setDurationWeight(100 - value - Math.round(remaining * motorRatio));
    } else {
      const remaining = 100 - value;
      const motorRatio = motorWeight / (motorWeight + nonMotorWeight || 1);
      setDurationWeight(value);
      setMotorWeight(Math.round(remaining * motorRatio));
      setNonMotorWeight(100 - value - Math.round(remaining * motorRatio));
    }
    
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handlePresetClick = (presetName: string) => {
    const preset = TREATMENT_GOAL_PRESETS.find(p => p.name === presetName);
    if (preset) {
      setMotorWeight(Math.round(preset.w_motor * 100));
      setNonMotorWeight(Math.round(preset.w_non_motor * 100));
      setDurationWeight(Math.round(preset.w_duration * 100));
      setNonMotorDiaryRatio(Math.round(preset.non_motor_diary_ratio * 100));
      setHasChanges(true);
      setSaveSuccess(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateGoals({
        w_motor: motorWeight / 100,
        w_non_motor: nonMotorWeight / 100,
        w_duration: durationWeight / 100,
        non_motor_diary_ratio: nonMotorDiaryRatio / 100,
        notes: notes || null,
      });
      setHasChanges(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save treatment goals:', err);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-text-main mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Treatment Goals
        </h2>
        <LoadingState />
      </div>
    );
  }

  const showWarning = Boolean(error && !data);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1">
        <h2 className="text-2xl font-bold text-text-main flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Treatment Goals
        </h2>
        <span className="text-xs uppercase tracking-wide text-text-muted">Severity Weighting</span>
      </div>

      <Card className="p-3">
        {showWarning && (
          <div className="mb-3 rounded-sm border border-yellow-200 bg-yellow-50 px-2 py-1.5 text-xs text-yellow-700">
            Using default treatment goals. Configure custom goals below and save to store them.
          </div>
        )}
        <div className="mb-3">
          <p className="text-xs text-text-muted mb-2">
            Configure how different severity components are weighted during optimization.
            Weights automatically normalize to 100%.
          </p>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-4">
            <div className="rounded-sm border border-border-subtle bg-brand-blue-soft px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Diagnosis</div>
              <div className="text-lg font-semibold text-brand-blue">{motorWeight}%</div>
              <div className="text-[11px] text-text-muted">IMU-derived motor severity composite.</div>
            </div>
            <div className="rounded-sm border border-border-subtle bg-brand-blue-soft px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Non-Motor</div>
              <div className="text-lg font-semibold text-brand-blue">{nonMotorWeight}%</div>
              <div className="text-[11px] text-text-muted">Diary + standard tests blended.</div>
            </div>
            <div className="rounded-sm border border-border-subtle bg-brand-blue-soft px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Duration</div>
              <div className="text-lg font-semibold text-brand-blue">{durationWeight}%</div>
              <div className="text-[11px] text-text-muted">Years since diagnosis, normalized.</div>
            </div>
            <div className="rounded-sm border border-border-subtle bg-surface-alt px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Speech</div>
              <div className="text-lg font-semibold text-text-muted">Coming soon</div>
              <div className="text-[11px] text-text-muted">Speech severity is not wired yet.</div>
            </div>
          </div>
        </div>

        {/* Preset Buttons */}
        <div className="mb-4">
          <label className="text-xs font-semibold text-text-main block mb-2">Quick Presets</label>
          <div className="flex flex-wrap gap-2">
            {TREATMENT_GOAL_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={() => handlePresetClick(preset.name)}
                className="px-3 py-1.5 text-xs font-semibold rounded-sm border-2 transition-all duration-200 bg-surface text-text-main border-border-subtle hover:border-brand-blue hover:bg-brand-blue-soft"
                title={preset.description}
              >
                {preset.name === 'default' && '⚖️ Balanced'}
                {preset.name === 'motor_focused' && '🎯 Motor'}
                {preset.name === 'quality_of_life_focused' && '💚 Quality of Life'}
              </button>
            ))}
          </div>
        </div>

        {/* Weight Sliders */}
        <div className="space-y-4">
          {/* Diagnosis Weight */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-text-main">
                Motor Severity (IMU)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-blue font-bold">{motorWeight}%</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={motorWeight}
                  onChange={(e) => handleWeightChange('motor', Number(e.target.value))}
                  className="w-16 rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  aria-label="Diagnosis weight percent"
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={motorWeight}
              onChange={(e) => handleWeightChange('motor', parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Non-Motor Symptoms Weight */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-text-main">
                Non-Motor Severity
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-blue font-bold">{nonMotorWeight}%</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={nonMotorWeight}
                  onChange={(e) => handleWeightChange('non_motor', Number(e.target.value))}
                  className="w-16 rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  aria-label="Non-motor symptoms weight percent"
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={nonMotorWeight}
              onChange={(e) => handleWeightChange('non_motor', parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-text-main">Non-motor diary split</label>
              <span className="text-xs text-brand-blue font-bold">{nonMotorDiaryRatio}% diary</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={nonMotorDiaryRatio}
              onChange={(e) => {
                setNonMotorDiaryRatio(Number(e.target.value));
                setHasChanges(true);
                setSaveSuccess(false);
              }}
              className="w-full accent-brand-blue"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>0% tests</span>
              <span>100% diary</span>
            </div>
          </div>

          {/* Disease Duration Weight */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-text-main">
                Disease Duration
              </label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-brand-blue font-bold">{durationWeight}%</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={durationWeight}
                  onChange={(e) => handleWeightChange('duration', Number(e.target.value))}
                  className="w-16 rounded-sm border border-border-subtle px-2 py-0.5 text-xs text-text-main focus:outline-none focus:ring-2 focus:ring-brand-blue"
                  aria-label="Disease duration weight percent"
                />
              </div>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              step="1"
              value={durationWeight}
              onChange={(e) => handleWeightChange('duration', parseInt(e.target.value))}
              className="w-full accent-brand-blue"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>

          {/* Speech Weight (Coming soon) */}
          <div className="opacity-60">
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-text-main">
                Speech (Coming soon)
              </label>
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
              max="100"
              step="1"
              value={0}
              disabled
              className="w-full accent-brand-blue"
            />
            <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
              <span>0%</span>
              <span>100%</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="mt-4">
          <label className="text-xs font-semibold text-text-main block mb-1">
            Notes (Optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => {
              setNotes(e.target.value);
              setHasChanges(true);
              setSaveSuccess(false);
            }}
            placeholder="Add any notes about these treatment goals..."
            className="w-full px-2 py-1.5 text-xs border border-border-subtle rounded-sm focus:outline-none focus:ring-2 focus:ring-brand-blue resize-none"
            rows={2}
          />
        </div>

        {/* Save Button */}
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs">
            {hasChanges && (
              <span className="text-yellow-600 font-semibold">● Unsaved changes</span>
            )}
            {saveSuccess && (
              <span className="text-green-600 font-semibold">✓ Saved successfully</span>
            )}
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanges || updating}
            className={`px-4 py-2 text-xs font-semibold rounded-sm transition-colors duration-75 ${
              hasChanges && !updating
                ? 'bg-brand-blue text-white hover:bg-brand-navy'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {updating ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </Card>
    </div>
  );
}
