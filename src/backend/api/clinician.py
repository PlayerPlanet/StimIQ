import math
import os
import tempfile

from fastapi import APIRouter, HTTPException, Query
import pandas as pd

from .schemas import (
    DbsState,
    DbsTuningRecommendation,
    SimulationRequest,
    SimulationParameterTuple,
    SimulationResponse,
    OptimizationStepRequest,
    OptimizationStepResponse,
    OptimizationInputParameterTuple,
    AgentPromptRequest,
    AgentPromptResponse,
)
from .services import (
    get_dbs_state_for_patient,
    get_dbs_tuning_recommendation,
    run_hypothetical_simulation,
    run_agent_prompt,
)


router = APIRouter(prefix="/clinician", tags=["clinician"])


def _normalize_phase_deg(phase_rad: float) -> float:
    phase_deg = math.degrees(phase_rad)
    return ((phase_deg + 180.0) % 360.0) - 180.0


def _pulse_width_to_us(pulse_width_s: float) -> float:
    """
    Convert tuning pulse width value to microseconds for SimulationParameterTuple.

    Notes:
    - Existing tuning payloads commonly carry values like 0.06, which in this project
      correspond to 60 us (i.e., milliseconds-scale numeric values mislabeled as seconds).
    - This helper tolerates both conventions and returns a clamped microsecond value.
    """
    value = float(pulse_width_s)

    if value <= 0.0:
        return 1.0

    # If truly seconds-scale (e.g. 60e-6), convert seconds -> us.
    if value <= 0.001:
        microseconds = value * 1_000_000.0
    # Common project convention: values like 0.06 represent ms -> 60 us.
    elif value <= 1.0:
        microseconds = value * 1_000.0
    # Fallback: assume already in microseconds-like scale.
    else:
        microseconds = value

    return max(1.0, min(500.0, microseconds))


def _clamp(value: float, minimum: float, maximum: float) -> float:
    return max(minimum, min(maximum, float(value)))


def _normalize_input_pulse_width_us(value: float) -> float:
    """
    Normalize incoming optimize-step pulse width into canonical microseconds.
    Accepts legacy-scaled values like 60000 and maps them to 60.
    """
    v = float(value)
    if v <= 500.0:
        return _clamp(v, 1.0, 500.0)
    if v <= 500_000.0:
        return _clamp(v / 1_000.0, 1.0, 500.0)
    return _clamp(v / 1_000_000.0, 1.0, 500.0)


def _normalize_input_tuples(
    tuples: list[OptimizationInputParameterTuple],
) -> list[SimulationParameterTuple]:
    normalized: list[SimulationParameterTuple] = []
    for t in tuples:
        normalized.append(
            SimulationParameterTuple(
                amplitude_ma=_clamp(t.amplitude_ma, 0.0, 10.0),
                frequency_hz=_clamp(t.frequency_hz, 1.0, 500.0),
                pulse_width_us=_normalize_input_pulse_width_us(t.pulse_width_us),
                phase_deg=_clamp(t.phase_deg, -180.0, 180.0),
            )
        )
    return normalized


def _tuples_to_bayes_row(parameter_tuples: list[SimulationParameterTuple]) -> dict:
    row: dict[str, float] = {}
    for i, t in enumerate(parameter_tuples):
        row[f"amp_{i}"] = float(t.amplitude_ma)
        row[f"freq_hz_{i}"] = float(t.frequency_hz)
        row[f"pulse_width_s_{i}"] = float(t.pulse_width_us) / 1_000_000.0
        row[f"phase_rad_{i}"] = math.radians(float(t.phase_deg))
    return row


def _bayes_params_to_tuples(next_params: dict, tuple_count: int) -> list[SimulationParameterTuple]:
    tuples: list[SimulationParameterTuple] = []
    for i in range(tuple_count):
        tuples.append(
            SimulationParameterTuple(
                amplitude_ma=_clamp(next_params.get(f"amp_{i}", 2.5), 0.0, 10.0),
                frequency_hz=_clamp(next_params.get(f"freq_hz_{i}", 130.0), 1.0, 500.0),
                pulse_width_us=_clamp(float(next_params.get(f"pulse_width_s_{i}", 60e-6)) * 1_000_000.0, 1.0, 500.0),
                phase_deg=_clamp(math.degrees(float(next_params.get(f"phase_rad_{i}", 0.0))), -180.0, 180.0),
            )
        )
    return tuples


def _compute_severity(simulation: SimulationResponse) -> float:
    values: list[float] = []
    for channel in simulation.channels:
        for point in channel.points:
            values.append(abs(float(point.deviation)))
    if not values:
        return 0.0
    return float(sum(values) / len(values))


@router.get("/dbs_state/{patient_id}", response_model=DbsState)
async def get_dbs_state(patient_id: str):
    """Get DBS state for a patient including channel configuration and timeseries data."""
    try:
        dbs_state = get_dbs_state_for_patient(patient_id)
        return dbs_state
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve DBS state: {str(e)}")


@router.get("/dbs_tuning/{patient_id}", response_model=DbsTuningRecommendation)
async def get_dbs_tuning(
    patient_id: str,
    include_simulation: bool = Query(default=False),
    tuple_count: int = Query(default=4, ge=2, le=16),
):
    """Get DBS tuning recommendations for a patient."""
    try:
        recommendation = get_dbs_tuning_recommendation(patient_id)

        if not include_simulation:
            return recommendation

        if tuple_count not in (2, 4, 8, 16):
            raise HTTPException(
                status_code=422,
                detail="tuple_count must be one of [2, 4, 8, 16].",
            )

        recommended = recommendation.recommended_parameters[:tuple_count]
        if len(recommended) < tuple_count:
            raise HTTPException(
                status_code=422,
                detail=f"Not enough recommended channels ({len(recommended)}) for tuple_count={tuple_count}.",
            )

        tuples = [
            SimulationParameterTuple(
                amplitude_ma=float(ch.amplitude),
                frequency_hz=float(ch.frequency),
                pulse_width_us=_pulse_width_to_us(float(ch.pulse_width_s)),
                phase_deg=_normalize_phase_deg(float(ch.phase_rad)),
            )
            for ch in recommended
        ]

        simulation_payload = SimulationRequest(tuple_count=tuple_count, parameter_tuples=tuples)
        simulation = run_hypothetical_simulation(simulation_payload)
        return recommendation.model_copy(update={"simulated_data": simulation})
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve DBS tuning recommendation: {str(e)}")


@router.post("/simulate", response_model=SimulationResponse)
async def simulate_hypothetical_parameters(payload: SimulationRequest):
    """Run simulation using a simulation-specific contract and return 3-channel position deviation traces."""
    try:
        return run_hypothetical_simulation(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run simulation: {str(e)}")


@router.post("/optimize-step", response_model=OptimizationStepResponse)
async def optimize_step(payload: OptimizationStepRequest):
    """
    Closed-loop optimization step:
    1) Re-evaluate current tuples with simulator.
    2) Build a tiny local dataset around current tuples.
    3) Run Bayes on that dataset.
    4) Return next tuples and optional simulation for instant UI updates.
    """
    try:
        from Bayes import model

        normalized_current_tuples = _normalize_input_tuples(payload.current_parameter_tuples)
        current_request = SimulationRequest(
            tuple_count=payload.tuple_count,
            parameter_tuples=normalized_current_tuples,
        )
        current_sim = run_hypothetical_simulation(current_request)

        base_row = _tuples_to_bayes_row(normalized_current_tuples)
        base_row["severity"] = _compute_severity(current_sim)

        rows = [base_row]
        scales = (0.96, 1.04)
        for scale in scales:
            perturbed = []
            for t in normalized_current_tuples:
                perturbed.append(
                    SimulationParameterTuple(
                        amplitude_ma=_clamp(t.amplitude_ma * scale, 0.0, 10.0),
                        frequency_hz=_clamp(t.frequency_hz * scale, 1.0, 500.0),
                        pulse_width_us=_clamp(t.pulse_width_us * scale, 1.0, 500.0),
                        phase_deg=_clamp(t.phase_deg, -180.0, 180.0),
                    )
                )
            perturbed_req = SimulationRequest(tuple_count=payload.tuple_count, parameter_tuples=perturbed)
            perturbed_sim = run_hypothetical_simulation(perturbed_req)
            row = _tuples_to_bayes_row(perturbed)
            row["severity"] = _compute_severity(perturbed_sim)
            rows.append(row)

        df = pd.DataFrame(rows)
        with tempfile.NamedTemporaryFile(mode="w", suffix=".csv", delete=False) as tmp:
            df.to_csv(tmp.name, index=False)
            temp_csv_path = tmp.name

        try:
            bayes_result = model(
                data_path=temp_csv_path,
                n=len(rows),
                severity_col="severity",
                random_state=42,
            )
        finally:
            try:
                os.unlink(temp_csv_path)
            except OSError:
                pass

        next_params = bayes_result.get("next_params", {}) or {}
        next_tuples = _bayes_params_to_tuples(next_params, payload.tuple_count)

        sim_response: SimulationResponse | None = None
        step_severity = float(base_row["severity"])
        if payload.include_simulation:
            next_req = SimulationRequest(tuple_count=payload.tuple_count, parameter_tuples=next_tuples)
            sim_response = run_hypothetical_simulation(next_req)
            step_severity = _compute_severity(sim_response)

        return OptimizationStepResponse(
            status="ok",
            message="Optimization step completed.",
            step_severity=step_severity,
            next_parameter_tuples=next_tuples,
            simulation=sim_response,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to run optimize step: {str(e)}")


@router.post("/agent-prompt", response_model=AgentPromptResponse)
async def clinician_agent_prompt(payload: AgentPromptRequest):
    """Send a free-form prompt to the DBS agent and return cleaned response text."""
    try:
        response_text = run_agent_prompt(payload.prompt)
        return AgentPromptResponse(
            status="ok",
            message="Agent response generated.",
            response_text=response_text,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process agent prompt: {str(e)}")
