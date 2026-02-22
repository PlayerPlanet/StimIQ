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
import { optimizeSimulationStep, simulateHypotheticalParameters } from '../../lib/apiClient';
import type {
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

const OPTIMIZATION_STEPS = 50;

const normalizePulseWidthUs = (value: number): number => {
  if (value <= 500) return Math.max(1, value);
  if (value <= 500000) return Math.max(1, Math.min(500, value / 1000));
  return Math.max(1, Math.min(500, value / 1000000));
};

const computeSeverityScore = (simulation: HypotheticalSimulationResponse): number => {
  const allDeviations = simulation.channels.flatMap((channel) =>
    channel.points.map((point) => Math.abs(point.deviation))
  );
  if (allDeviations.length === 0) {
    return 0;
  }
  return allDeviations.reduce((sum, value) => sum + value, 0) / allDeviations.length;
};

const getDisplayScale = (maxAbsValue: number): { factor: number; unit: string } => {
  if (!Number.isFinite(maxAbsValue) || maxAbsValue <= 0) {
    return { factor: 1, unit: '' };
  }

  if (maxAbsValue < 1e-9) return { factor: 1_000_000_000_000, unit: 'p' };
  if (maxAbsValue < 1e-6) return { factor: 1_000_000_000, unit: 'n' };
  if (maxAbsValue < 1e-3) return { factor: 1_000_000, unit: 'u' };
  return { factor: 1, unit: '' };
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
      let workingTuples = parameterTuples.slice(0, tupleCount).map((tuple) => ({
        ...tuple,
        pulse_width_us: normalizePulseWidthUs(tuple.pulse_width_us),
      }));
      setParameterTuples(workingTuples);
      for (let step = 1; step <= OPTIMIZATION_STEPS; step += 1) {
        setStatusType('success');
        setStatusMessage(`Optimizing step ${step}/${OPTIMIZATION_STEPS}...`);

        const stepResponse = await optimizeSimulationStep({
          tuple_count: tupleCount,
          current_parameter_tuples: workingTuples,
          include_simulation: true,
        });

        workingTuples = stepResponse.next_parameter_tuples.map((tuple) => ({ ...tuple }));
        setParameterTuples(workingTuples);

        const simResponse =
          stepResponse.simulation ??
          (await simulateHypotheticalParameters({
            tuple_count: tupleCount,
            parameter_tuples: workingTuples,
          }));

        setSimulationData(simResponse);

        const severity =
          typeof stepResponse.step_severity === 'number'
            ? stepResponse.step_severity
            : computeSeverityScore(simResponse);
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

  const chartDataRaw = useMemo(() => {
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

  const simulationDisplayScale = useMemo(() => {
    const maxAbs = chartDataRaw.reduce((max, row) => {
      const rowMax = Math.max(Math.abs(row.ch1), Math.abs(row.ch2), Math.abs(row.ch3));
      return Math.max(max, rowMax);
    }, 0);
    return getDisplayScale(maxAbs);
  }, [chartDataRaw]);

  const chartData = useMemo(
    () =>
      chartDataRaw.map((row) => ({
        time_s: row.time_s,
        ch1: row.ch1 * simulationDisplayScale.factor,
        ch2: row.ch2 * simulationDisplayScale.factor,
        ch3: row.ch3 * simulationDisplayScale.factor,
      })),
    [chartDataRaw, simulationDisplayScale.factor]
  );

  const severityDisplayScale = useMemo(() => {
    const maxAbs = severityHistory.reduce((max, point) => Math.max(max, Math.abs(point.severity)), 0);
    return getDisplayScale(maxAbs);
  }, [severityHistory]);

  const severityHistoryScaled = useMemo(
    () =>
      severityHistory.map((point) => ({
        step: point.step,
        severity: point.severity * severityDisplayScale.factor,
      })),
    [severityHistory, severityDisplayScale.factor]
  );

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
                      <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} unit={simulationDisplayScale.unit} />
                      <Tooltip
                        formatter={(value) => `${Number(value ?? 0).toFixed(3)} ${simulationDisplayScale.unit}`}
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
                        <LineChart data={severityHistoryScaled} margin={{ top: 10, right: 16, left: 0, bottom: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#d9e2ec" />
                          <XAxis dataKey="step" stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} />
                          <YAxis stroke="#6b7280" tick={{ fill: '#6b7280', fontSize: 11 }} unit={severityDisplayScale.unit} />
                          <Tooltip formatter={(value) => `${Number(value ?? 0).toFixed(3)} ${severityDisplayScale.unit}`} />
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
