from typing import List
import logging

from ..schemas.dbs_tuning import ChannelRecommendation, DbsTuningRecommendation
from ..schemas.dbs_state import ChannelState
from ...dbs_agent.agent import interpret_dbs_parameters
from ...Bayes import model
from .dbs_state import get_dbs_state_for_patient, get_mock_state_for_patient

logger = logging.getLogger(__name__)


def _channels_to_programming_dict(channels: List[ChannelState]) -> dict:
    """Convert a list of ChannelState to a programming dict for the agent."""
    return {
        "channels": [
            {
                "channel_id": ch.channel_id,
                "amplitude": ch.amplitude,
                "frequency": ch.frequency,
                "pulse_width_s": ch.pulse_width_s,
                "phase_rad": ch.phase_rad,
            }
            for ch in channels
        ]
    }


def _bayes_params_to_programming_dict(next_params: dict) -> dict:
    """Convert Bayes next_params dict to a programming dict for the agent.
    
    Bayes returns: {"amp_0": val, "freq_hz_0": val, "pulse_width_s_0": val, "phase_rad_0": val, ...}
    Convert to: {"channels": [{"channel_id": 1, "amplitude": ..., "frequency": ..., ...}, ...]}
    """
    # Group by electrode index
    channels_data: dict[int, dict] = {}
    
    for param_name, value in next_params.items():
        # Parse parameter name: base_index (e.g., "amp_0", "freq_hz_1")
        parts = param_name.rsplit("_", 1)
        if len(parts) != 2:
            continue
        
        base_name = parts[0]
        try:
            electrode_idx = int(parts[1])
        except ValueError:
            continue
        
        if electrode_idx not in channels_data:
            channels_data[electrode_idx] = {"channel_id": electrode_idx + 1}
        
        # Map base name to schema field
        if base_name == "amp":
            channels_data[electrode_idx]["amplitude"] = float(value)
        elif base_name == "freq_hz":
            channels_data[electrode_idx]["frequency"] = float(value)
        elif base_name == "pulse_width_s":
            channels_data[electrode_idx]["pulse_width_s"] = float(value)
        elif base_name == "phase_rad":
            channels_data[electrode_idx]["phase_rad"] = float(value)
    
    # Sort by channel_id and return
    sorted_channels = sorted(channels_data.values(), key=lambda x: x["channel_id"])
    return {"channels": sorted_channels}


def get_mock_tuning_recommendation(patient_id: str) -> DbsTuningRecommendation:
    """Return DBS tuning recommendations for a patient using mock data."""
    
    recommended_channels = [
        ChannelRecommendation(
            channel_id=1,
            amplitude=2.8,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelRecommendation(
            channel_id=2,
            amplitude=2.1,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelRecommendation(
            channel_id=3,
            amplitude=3.0,
            frequency=135.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelRecommendation(
            channel_id=4,
            amplitude=2.4,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelRecommendation(
            channel_id=5,
            amplitude=2.2,
            frequency=125.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelRecommendation(
            channel_id=6,
            amplitude=2.4,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelRecommendation(
            channel_id=7,
            amplitude=3.1,
            frequency=130.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
        ChannelRecommendation(
            channel_id=8,
            amplitude=2.3,
            frequency=128.0,
            pulse_width_s=0.06,
            phase_rad=0.0,
        ),
    ]
    
    explanations = [
        "Based on historical patterns, a moderate increase in amplitude on channels 1 and 3 has shown potential to reduce tremor severity.",
        "The recommended frequency adjustments may help optimize motor control during peak symptom periods.",
    ]
    
    return DbsTuningRecommendation(
        patient_id=patient_id,
        recommended_parameters=recommended_channels,
        explanations=explanations,
    )


def get_dbs_tuning_recommendation(patient_id: str) -> DbsTuningRecommendation:
    """
    Return DBS tuning recommendations for a patient using Bayesian optimization and AI analysis.
    Falls back to mock data if any step fails.
    
    Args:
        patient_id: The patient ID
        
    Returns:
        DbsTuningRecommendation object with AI-generated explanations
    """
    try:
        # Step 1: Get current DBS state
        current_state = get_dbs_state_for_patient(patient_id)
        current_programming = _channels_to_programming_dict(current_state.channels)
        
        # Step 2: Get proposed parameters from Bayesian optimizer
        bayes_output = model(patient_id=patient_id)
        proposed_params = bayes_output.get("next_params", {})
        proposed_programming = _bayes_params_to_programming_dict(proposed_params)
        
        # Step 3: Build patient deltas from timeseries if available
        patient_deltas = {
            "tremor_reduction": "pending optimization",
            "new_symptoms": [],
        }
        if current_state.tremor_timeseries and len(current_state.tremor_timeseries) >= 2:
            latest_tremor = current_state.tremor_timeseries[-1].avg_tremor_activity
            prev_tremor = current_state.tremor_timeseries[-2].avg_tremor_activity
            tremor_change = ((latest_tremor - prev_tremor) / prev_tremor * 100) if prev_tremor != 0 else 0
            patient_deltas["tremor_trend"] = f"{tremor_change:+.1f}%"
        
        # Step 4: Call AI agent for clinical interpretation
        ai_output = interpret_dbs_parameters(
            current_programming=current_programming,
            proposed_programming=proposed_programming,
            patient_deltas=patient_deltas,
        )
        ui_explanation = ai_output.get("clean_ui_response", "")
        
        # Step 5: Build recommended channels from proposed parameters
        recommended_channels = []
        proposed_channels = proposed_programming.get("channels", [])
        for ch_data in proposed_channels:
            recommended_channels.append(
                ChannelRecommendation(
                    channel_id=ch_data.get("channel_id", 0),
                    amplitude=ch_data.get("amplitude", 0.0),
                    frequency=ch_data.get("frequency", 0.0),
                    pulse_width_s=ch_data.get("pulse_width_s", 0.0),
                    phase_rad=ch_data.get("phase_rad", 0.0),
                )
            )
        
        # If AI generated an explanation, use it; otherwise use a default
        explanations = [ui_explanation] if ui_explanation.strip() else [
            "Bayesian optimization has identified promising parameter adjustments to improve symptom control."
        ]
        
        return DbsTuningRecommendation(
            patient_id=patient_id,
            recommended_parameters=recommended_channels,
            explanations=explanations,
        )
        
    except Exception as e:
        logger.warning(f"Failed to generate AI tuning recommendation for patient {patient_id}: {e}. Falling back to mock data.")
        return get_mock_tuning_recommendation(patient_id)
