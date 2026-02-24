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
  const [speechWeight, setSpeechWeight] = useState(0);
  const [nonMotorDiaryRatio, setNonMotorDiaryRatio] = useState(50);
  const [notes, setNotes] = useState('');
  const [hasChanges, setHasChanges] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Lock state for each weight
  const [lockedWeights, setLockedWeights] = useState({
    motor: false,
    non_motor: false,
    duration: false,
    speech: false,
  });

  // Initialize from fetched data
  useEffect(() => {
    if (!data) {
      return;
    }

    const defaultPreset = TREATMENT_GOAL_PRESETS[0];
    const wMotor = data.w_motor ?? defaultPreset.w_motor;
    const wNonMotor = data.w_non_motor ?? defaultPreset.w_non_motor;
    const wDuration = data.w_duration ?? defaultPreset.w_duration;
    const wSpeech = data.w_speech ?? defaultPreset.w_speech;
    const diaryRatio = data.non_motor_diary_ratio ?? defaultPreset.non_motor_diary_ratio;

    setMotorWeight(Math.round(wMotor * 100));
    setNonMotorWeight(Math.round(wNonMotor * 100));
    setDurationWeight(Math.round(wDuration * 100));
    setSpeechWeight(Math.round(wSpeech * 100));
    setNonMotorDiaryRatio(Math.round(diaryRatio * 100));
    setNotes(data.notes ?? '');
    setHasChanges(false);
    setSaveSuccess(false);
  }, [data]);

  const clampPercent = (value: number) => Math.max(0, Math.min(100, Math.round(value)));

  const toggleLock = (type: WeightKey) => {
    setLockedWeights((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  const handleWeightChange = (type: WeightKey, value: number) => {
    const currentValues = {
      motor: motorWeight,
      non_motor: nonMotorWeight,
      duration: durationWeight,
      speech: speechWeight,
    };

    // Calculate locked total (excluding the one being changed)
    let lockedTotal = 0;
    let unlockedWeights: WeightKey[] = [];
    const allWeights: WeightKey[] = ['motor', 'non_motor', 'duration', 'speech'];

    allWeights.forEach((w) => {
      if (lockedWeights[w] && w !== type) {
        lockedTotal += currentValues[w];
      } else if (!lockedWeights[w] && w !== type) {
        unlockedWeights.push(w);
      }
    });

    const available = 100 - lockedTotal;
    const adjustedValue = clampPercent(Math.min(value, available));
    const remaining = available - adjustedValue;
    const perOther = unlockedWeights.length > 0 ? clampPercent(remaining / unlockedWeights.length) : 0;

    // Set the changed weight
    if (type === 'motor') setMotorWeight(adjustedValue);
    else if (type === 'non_motor') setNonMotorWeight(adjustedValue);
    else if (type === 'duration') setDurationWeight(adjustedValue);
    else if (type === 'speech') setSpeechWeight(adjustedValue);

    // Set other unlocked weights
    unlockedWeights.forEach((w) => {
      if (w === 'motor') setMotorWeight(perOther);
      else if (w === 'non_motor') setNonMotorWeight(perOther);
      else if (w === 'duration') setDurationWeight(perOther);
      else if (w === 'speech') setSpeechWeight(perOther);
    });

    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handlePresetClick = (presetName: string) => {
    const preset = TREATMENT_GOAL_PRESETS.find((item) => item.name === presetName);
    if (!preset) {
      return;
    }

    setMotorWeight(Math.round(preset.w_motor * 100));
    setNonMotorWeight(Math.round(preset.w_non_motor * 100));
    setDurationWeight(Math.round(preset.w_duration * 100));
    setSpeechWeight(Math.round(preset.w_speech * 100));
    setNonMotorDiaryRatio(Math.round(preset.non_motor_diary_ratio * 100));
    setHasChanges(true);
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    try {
      await updateGoals({
        w_motor: motorWeight / 100,
        w_non_motor: nonMotorWeight / 100,
        w_duration: durationWeight / 100,
        w_speech: speechWeight / 100,
        non_motor_diary_ratio: nonMotorDiaryRatio / 100,
        notes: notes || null,
      });
      setHasChanges(false);
      setSaveSuccess(true);
    } catch (saveError) {
      console.error('Failed to save treatment goals:', saveError);
    }
  };

  if (loading) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-text-main mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Treatment Goals
        </h2>
        <LoadingState />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div>
        <h2 className="text-2xl font-bold text-text-main mb-2 flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Treatment Goals
        </h2>
        <Card className="p-3 bg-red-50 border border-red-200">
          <p className="text-xs text-red-700">Failed to load treatment goals.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b border-border-subtle pb-1">
        <h2 className="text-2xl font-bold text-text-main flex items-center">
          <svg className="w-6 h-6 mr-2 text-brand-blue" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Treatment Goals
        </h2>
        <span className="text-xs uppercase tracking-wide text-text-muted">Weights</span>
      </div>

      <Card className="p-3">
        <div className="mb-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <div className="rounded-sm border border-border-subtle bg-brand-blue-soft px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Motor symptoms</div>
              <div className="text-lg font-semibold text-brand-blue">{motorWeight}%</div>
              <div className="text-[11px] text-text-muted">IMU-derived motor severity (tremor/bradykinesia).</div>
            </div>
            <div className="rounded-sm border border-border-subtle bg-brand-blue-soft px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Non-motor symptoms</div>
              <div className="text-lg font-semibold text-brand-blue">{nonMotorWeight}%</div>
              <div className="text-[11px] text-text-muted">PROMs and standardized tests (diary + tests).</div>
            </div>
            <div className="rounded-sm border border-border-subtle bg-brand-blue-soft px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Disease duration</div>
              <div className="text-lg font-semibold text-brand-blue">{durationWeight}%</div>
              <div className="text-[11px] text-text-muted">Years since diagnosis, normalized.</div>
            </div>
            <div className="rounded-sm border border-border-subtle bg-brand-blue-soft px-2 py-2">
              <div className="text-[10px] uppercase tracking-wide text-text-muted">Speaking ability</div>
              <div className="text-lg font-semibold text-brand-blue">{speechWeight}%</div>
              <div className="text-[11px] text-text-muted">Speech task severity (placeholder).</div>
            </div>
          </div>
        </div>

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

        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-main mb-1">Motor symptoms (IMU)</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={motorWeight}
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
              <p className="mt-1 text-[10px] text-text-muted">Wearable IMU features: tremor (3–7 Hz), bradykinesia, amplitude.</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1">Non-motor symptoms</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={nonMotorWeight}
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
              <p className="mt-1 text-[10px] text-text-muted">PROMs &amp; standardized tests (mood, sleep, fatigue, etc.).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1">Disease duration</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={durationWeight}
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
              <p className="mt-1 text-[10px] text-text-muted">Years since diagnosis (normalized 0–30+ years).</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-main mb-1">Speaking ability</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={1}
                  value={speechWeight}
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
              <p className="mt-1 text-[10px] text-text-muted">Speech task severity (placeholder, not yet in loss).</p>
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
                value={nonMotorDiaryRatio}
                onChange={(e) => {
                  setNonMotorDiaryRatio(clampPercent(Number(e.target.value)));
                  setHasChanges(true);
                  setSaveSuccess(false);
                }}
                className="w-14 rounded-sm border border-border-subtle px-2 py-1 text-xs text-text-main font-semibold focus:outline-none focus:ring-2 focus:ring-brand-blue"
                aria-label="Non-motor diary ratio percent"
              />
              <span className="text-xs text-text-muted">% diary (0=tests, 100=diary)</span>
            </div>
            <p className="mt-1 text-[10px] text-text-muted">Balance between standardized tests and patient diary entries.</p>
          </div>
        </div>

        <div className="mt-4">
          <label className="text-xs font-semibold text-text-main block mb-1">Notes (Optional)</label>
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

        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs">
            {hasChanges && <span className="text-yellow-600 font-semibold">● Unsaved changes</span>}
            {saveSuccess && <span className="text-green-600 font-semibold">✓ Saved successfully</span>}
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
