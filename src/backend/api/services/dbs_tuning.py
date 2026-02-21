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
        # Get current DBS state (returns DbsState schema)
        current_programming = get_dbs_state_for_patient(patient_id)
        
        # Build proposed programming from recommended_channels
        proposed_programming = DbsTuningRecommendation(
            patient_id=patient_id,
            recommended_parameters=recommended_channels,
            explanations=[]
        )
        
        patient_deltas = {
            "tremor_reduction": "+30%",
            "new_symptoms": ["Patient reports increased tingling in the right arm.", "Patient reports sleeping difficulties."]
        }
        
        # Convert Pydantic models to dictionaries using model_dump()
        result = interpret_dbs_parameters(
            current_programming=current_programming.model_dump(),
            proposed_programming=proposed_programming.model_dump(),
            patient_deltas=patient_deltas
        )
        
        # Extract the clean UI response and split into explanation list
        clean_response = result.get("clean_ui_response", "")
        explanations = [clean_response] if clean_response else ["Model failed to generate explanations."]
    except Exception as e:
        explanations = [f"Model failed to generate explanations: {str(e)}"]
    
    return DbsTuningRecommendation(
        patient_id=patient_id,
        recommended_parameters=recommended_channels,
        explanations=explanations,
    )
