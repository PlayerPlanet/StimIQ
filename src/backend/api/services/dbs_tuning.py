from typing import List
from ..schemas.dbs_tuning import ChannelRecommendation, DbsTuningRecommendation
from src.backend.dbs_agent.agent import interpret_dbs_parameters
from services.dbs_state import get_dbs_state_for_patient

def get_dbs_tuning_recommendation(patient_id: str) -> DbsTuningRecommendation:
    """
    Generate DBS tuning recommendations for a patient with mock data.
    
    Args:
        patient_id: The patient ID
        
    Returns:
        DbsTuningRecommendation object with recommended parameters and explanations
    """
    recommended_channels = [
        ChannelRecommendation(
            channel_id=1,
            amplitude=2.8,
            voltage=4.5,
            frequency=130.0,
            time_on_hours=19.0,
        ),
        ChannelRecommendation(
            channel_id=2,
            amplitude=2.6,
            voltage=4.1,
            frequency=130.0,
            time_on_hours=19.0,
        ),
        ChannelRecommendation(
            channel_id=3,
            amplitude=3.0,
            voltage=4.8,
            frequency=135.0,
            time_on_hours=18.5,
        ),
        ChannelRecommendation(
            channel_id=4,
            amplitude=2.7,
            voltage=4.3,
            frequency=130.0,
            time_on_hours=19.5,
        ),
    ]
    
    try:
        proposed_programming = get_dbs_tuning_recommendation(patient_id)
        current_programming = get_dbs_state_for_patient(patient_id)
        patient_deltas = {
            "tremor_reduction": "+30%",
            "new_symptoms": ["Patient reports increased tingling in the right arm.", "Patient reports sleeping difficulties."]
        }
        explanations = interpret_dbs_parameters(proposed_programming, current_programming, patient_deltas)
    except Exception:
        explanations = ["Model failed to generate explanations."]
    
    return DbsTuningRecommendation(
        patient_id=patient_id,
        recommended_parameters=recommended_channels,
        explanations=explanations,
    )
