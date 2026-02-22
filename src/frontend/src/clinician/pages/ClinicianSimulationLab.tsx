import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { ClinicianLayout } from '../../layouts/ClinicianLayout';
import { Card } from '../../components/common/Card';
import { getDbsTuningWithOptionalSimulation, simulateHypotheticalParameters } from '../../lib/apiClient';
import type {
  DbsTuningChannelRecommendation,
  HypotheticalParameterTuple,
  HypotheticalSimulationRequest,
  HypotheticalSimulationResponse,
} from '../../lib/types';

const TUPLE_COUNT_OPTIONS: Array<2 | 4 | 8 | 16> = [2, 4, 8, 16];

const DEFAULT_TUPLE: HypotheticalParameterTuple = {
  amplitude_ma: 2.5,
  frequency_hz: 130,
  pulse_width_us: 60,
  phase_deg: 0,
};

const PARAM_CONFIG: Array<{
  key: keyof HypotheticalParameterTuple;
  label: string;
  min: number;
  max: number;
  step: number;
  unit: string;
}> = [
  { key: 'amplitude_ma', label: 'Amplitude', min: 0, max: 6, step: 0.1, unit: 'mA' },
  { key: 'frequency_hz', label: 'Frequency', min: 20, max: 250, step: 1, unit: 'Hz' },
  { key: 'pulse_width_us', label: 'Pulse Width', min: 20, max: 240, step: 5, unit: 'us' },
  { key: 'phase_deg', label: 'Phase', min: -180, max: 180, step: 1, unit: 'deg' },
];

const makeTuple = (index: number): HypotheticalParameterTuple => ({
  ...DEFAULT_TUPLE,
  phase_deg: index % 2 === 0 ? 0 : 180,
});

const buildTupleArray = (count: 2 | 4 | 8 | 16): HypotheticalParameterTuple[] =>
  Array.from({ length: count }, (_, i) => makeTuple(i));

const OPTIMIZATION_PATIENT_ID = 'simulation-lab-demo';
const OPTIMIZATION_STEPS = 6;

const normalizePhaseDeg = (phaseRad: number): number => {
  const deg = (phaseRad * 180) / Math.PI;
  return ((deg + 180) % 360) - 180;
};

const mapRecommendedToTuple = (
  recommendation: DbsTuningChannelRecommendation
): HypotheticalParameterTuple => ({
  amplitude_ma: Number(recommendation.amplitude ?? 0),
  frequency_hz: Number(recommendation.frequency ?? 0),
  pulse_width_us: Number(recommendation.pulse_width_s ?? 0) * 1_000_000,
  phase_deg: normalizePhaseDeg(Number(recommendation.phase_rad ?? 0)),
});

const buildTupleArrayFromRecommendations = (
  recommendations: DbsTuningChannelRecommendation[],
  count: 2 | 4 | 8 | 16
): HypotheticalParameterTuple[] =>
  Array.from({ length: count }, (_, i) => {
    const recommended = recommendations[i];
    return recommended ? mapRecommendedToTuple(recommended) : makeTuple(i);
  });

const computeSeverityScore = (simulation: HypotheticalSimulationResponse): number => {
  const allDeviations = simulation.channels.flatMap((channel) =>
    channel.points.map((point) => Math.abs(point.deviation))
  );
  if (allDeviations.length === 0) {
    return 0;
  }
  return allDeviations.reduce((sum, value) => sum + value, 0) / allDeviations.length;
};

export function ClinicianSimulationLab() {
  const [tupleCount, setTupleCount] = useState<2 | 4 | 8 | 16>(4);
  const [parameterTuples, setParameterTuples] = useState<HypotheticalParameterTuple[]>(buildTupleArray(4));
  const [isSimulating, setIsSimulating] = useState(false);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusType, setStatusType] = useState<'success' | 'error' | null>(null);
  const [simulationData, setSimulationData] = useState<HypotheticalSimulationResponse | null>(null);
  const [severityHistory, setSeverityHistory] = useState<Array<{ step: number; severity: number }>>([]);

  const handleTupleCountChange = (nextCount: 2 | 4 | 8 | 16) => {
    setTupleCount(nextCount);
    setParameterTuples((prev) => {
      if (nextCount <= prev.length) {
        return prev.slice(0, nextCount);
      }
      const additional = Array.from({ length: nextCount - prev.length }, (_, i) => makeTuple(prev.length + i));
      return [...prev, ...additional];
    });
  };

  const handleSliderChange = (
    tupleIndex: number,
    key: keyof HypotheticalParameterTuple,
    value: string
  ) => {
    setParameterTuples((prev) =>
      prev.map((tuple, index) =>
        index === tupleIndex
          ? {
              ...tuple,
              [key]: Number(value),
            }
          : tuple
      )
    );
  };

  const buildSimulationPayload = (): HypotheticalSimulationRequest => ({
    tuple_count: tupleCount,
    parameter_tuples: parameterTuples.slice(0, tupleCount).map((tuple) => ({ ...tuple })),
  });

  const handleSimulate = async () => {
    setStatusMessage(null);
    setStatusType(null);
    setIsSimulating(true);

    try {
      const response = await simulateHypotheticalParameters(buildSimulationPayload());
      setSimulationData(response);
      setStatusType('success');
      setStatusMessage(response.message || 'Simulation request accepted.');
    } catch (error) {
      setStatusType('error');
      setStatusMessage(
        error instanceof Error
          ? error.message
          : 'Simulation failed.'
      );
    } finally {
      setIsSimulating(false);
    }
  };

  const handleOptimize = async () => {
    setStatusMessage(null);
    setStatusType(null);
    setIsOptimizing(true);
    setSeverityHistory([]);

    const nextSeverityHistory: Array<{ step: number; severity: number }> = [];

    try {
      for (let step = 1; step <= OPTIMIZATION_STEPS; step += 1) {
        const tuningResponse = await getDbsTuningWithOptionalSimulation(OPTIMIZATION_PATIENT_ID, {
          includeSimulation: true,
          tupleCount,
        });

        const shiftedTuples = buildTupleArrayFromRecommendations(
          tuningResponse.recommended_parameters ?? [],
          tupleCount
        );
        setParameterTuples(shiftedTuples);

        const simResponse =
          tuningResponse.simulated_data ??
          (await simulateHypotheticalParameters({
            tuple_count: tupleCount,
            parameter_tuples: shiftedTuples,
          }));

        setSimulationData(simResponse);

        const severity = computeSeverityScore(simResponse);
        nextSeverityHistory.push({ step, severity });
        setSeverityHistory([...nextSeverityHistory]);
      }

      setStatusType('success');
      setStatusMessage(`Optimization completed in ${OPTIMIZATION_STEPS} steps.`);
    } catch (error) {
      setStatusType('error');
      setStatusMessage(error instanceof Error ? error.message : 'Optimization failed.');
    } finally {
      setIsOptimizing(false);
    }
  };

  const chartData = useMemo(() => {
    if (!simulationData || simulationData.channels.length < 3) {
      return [];
    }

    const [ch1, ch2, ch3] = simulationData.channels;
    return ch1.points.map((point, index) => ({
      time_s: point.time_s,
      ch1: point.deviation,
      ch2: ch2.points[index]?.deviation ?? 0,
      ch3: ch3.points[index]?.deviation ?? 0,
    }));
  }, [simulationData]);

  return (
    <ClinicianLayout>
      <div className="px-4 py-3 space-y-3">
        <div className="border-b border-border-subtle pb-2">
          <h1 className="text-xl font-bold text-text-main">Hypothetical Parameter Simulation</h1>
          <p className="text-xs text-text-muted mt-1">
            Configure DBS parameters, run a simulation request, and prepare for future skeleton rendering.
          </p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-3">
          <div className="space-y-3">
            <Card className="p-3 min-h-[520px]">
              <h2 className="text-sm font-semibold text-text-main mb-2">Simulation Preview</h2>
              {chartData.length > 0 ? (
                <div className="h-[420px] border border-border-subtle rounded-sm bg-surface-alt p-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                      <XAxis dataKey="time_s" type="number" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} unit="s" />
                      <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                      <Tooltip
                        formatter={(value) => `${Number(value ?? 0).toFixed(3)}`}
                        labelFormatter={(label) => `t=${Number(label).toFixed(2)}s`}
                      />
                      <Legend />
                      <ReferenceLine y={0} stroke="#6b7280" strokeDasharray="4 4" />
                      <Line type="monotone" dataKey="ch1" name="Channel 1" stroke="#1d4ed8" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="ch2" name="Channel 2" stroke="#0f766e" dot={false} strokeWidth={2} />
                      <Line type="monotone" dataKey="ch3" name="Channel 3" stroke="#b45309" dot={false} strokeWidth={2} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[420px] border border-dashed border-border-subtle rounded-sm flex items-center justify-center bg-surface-alt">
                  <p className="text-xs text-text-muted px-4 text-center">
                    Run Simulate to render 3-channel position deviation from 0 over time.
                  </p>
                </div>
              )}
              <p className="text-xs text-text-muted mt-2">
                Output shows synthetic channel deviations around baseline 0 (timeseries preview before WebGL).
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  className="px-3 py-1.5 bg-surface-alt text-text-main border border-border-subtle rounded-sm text-xs font-semibold hover:bg-surface"
                >
                  Play
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-surface-alt text-text-main border border-border-subtle rounded-sm text-xs font-semibold hover:bg-surface"
                >
                  Pause
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-surface-alt text-text-main border border-border-subtle rounded-sm text-xs font-semibold hover:bg-surface"
                >
                  Reset View
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 bg-surface-alt text-text-main border border-border-subtle rounded-sm text-xs font-semibold hover:bg-surface"
                >
                  Toggle Trails
                </button>
              </div>

              <div className="mt-3 pt-3 border-t border-border-subtle grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <div>
                  <h3 className="text-xs font-semibold text-text-main mb-2">Severity Over Optimization Steps</h3>
                  {severityHistory.length > 0 ? (
                    <div className="h-[150px] border border-border-subtle rounded-sm bg-surface-alt p-2">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={severityHistory} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                          <XAxis dataKey="step" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                          <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                          <Tooltip formatter={(value) => `${Number(value ?? 0).toFixed(4)}`} />
                          <Line type="monotone" dataKey="severity" name="Severity" stroke="#dc2626" dot={false} strokeWidth={2} />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  ) : (
                    <div className="h-[150px] border border-dashed border-border-subtle rounded-sm flex items-center justify-center bg-surface-alt">
                      <p className="text-xs text-text-muted px-4 text-center">
                        Run Optimize to track severity across iterative Bayesian steps.
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-end gap-2">
                  <button
                    type="button"
                    onClick={handleSimulate}
                    disabled={isSimulating || isOptimizing}
                    className="px-4 py-2 bg-brand-blue text-white rounded-sm font-semibold text-sm hover:bg-brand-navy disabled:opacity-60"
                  >
                    {isSimulating ? 'Simulating...' : 'Simulate'}
                  </button>
                  <button
                    type="button"
                    onClick={handleOptimize}
                    disabled={isSimulating || isOptimizing}
                    className="px-4 py-2 bg-surface-alt text-text-main border border-border-subtle rounded-sm font-semibold text-sm hover:bg-surface disabled:opacity-60"
                  >
                    {isOptimizing ? 'Optimizing...' : 'Optimize'}
                  </button>
                </div>
              </div>
            </Card>
          </div>

          <Card className="p-3 h-fit max-h-[calc(100vh-120px)] overflow-y-auto">
            <h2 className="text-sm font-semibold text-text-main mb-2">Parameter Panel</h2>
            <div className="mb-3">
              <label className="block text-xs uppercase tracking-wide text-text-muted mb-1">
                Number of 4-tuples
              </label>
              <select
                value={tupleCount}
                onChange={(e) => handleTupleCountChange(Number(e.target.value) as 2 | 4 | 8 | 16)}
                className="w-full px-3 py-2 border border-border-subtle rounded-sm text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent"
              >
                {TUPLE_COUNT_OPTIONS.map((count) => (
                  <option key={count} value={count}>
                    {count} tuples
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-3">
              {parameterTuples.slice(0, tupleCount).map((tuple, tupleIndex) => (
                <Card key={tupleIndex} className="p-2 bg-surface-alt">
                  <h3 className="text-xs font-semibold text-text-main mb-2">
                    Tuple {tupleIndex + 1}
                  </h3>
                  <div className="space-y-2">
                    {PARAM_CONFIG.map((param) => (
                      <div key={`${tupleIndex}-${param.key}`}>
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-semibold text-text-main">{param.label}</label>
                          <span className="text-xs text-text-muted">
                            {tuple[param.key]} {param.unit}
                          </span>
                        </div>
                        <input
                          type="range"
                          min={param.min}
                          max={param.max}
                          step={param.step}
                          value={tuple[param.key]}
                          onChange={(e) => handleSliderChange(tupleIndex, param.key, e.target.value)}
                          className="w-full accent-brand-blue"
                        />
                        <div className="flex justify-between text-[10px] text-text-muted mt-0.5">
                          <span>{param.min}</span>
                          <span>{param.max}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>

            {statusMessage && (
              <div
                className={`mt-3 p-2 border rounded-sm text-xs ${
                  statusType === 'success'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                    : 'bg-amber-50 border-amber-200 text-amber-800'
                }`}
              >
                {statusMessage}
              </div>
            )}
          </Card>
        </div>
      </div>
    </ClinicianLayout>
  );
}
