from typing import List
from ..schemas.dbs_tuning import ChannelRecommendation, DbsTuningRecommendation
from .dbs_state import get_dbs_state_for_patient

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
        # Import lazily so API startup does not fail if agent env/config is missing.
        from dbs_agent.agent import interpret_dbs_parameters

        # Get current DBS state (returns DbsState Pydantic model)
        current_state = get_dbs_state_for_patient(patient_id)
        
        # Build proposed programming as a dict with recommended channels
        # (matching the structure that will be returned)
        proposed_dict = {
            "patient_id": patient_id,
            "recommended_parameters": [ch.model_dump() for ch in recommended_channels]
        }
        
        # Define patient deltas (symptom changes)
        patient_deltas = {
            "tremor_reduction": "+30%",
            "new_symptoms": [
                "Patient reports increased tingling in the right arm.", 
                "Patient reports sleeping difficulties."
            ]
        }
        
        # Call agent: Convert current_state to dict, pass proposed as dict
        # Agent returns: {"raw_response": str, "clean_ui_response": str}
        agent_result = interpret_dbs_parameters(
            current_programming=current_state.model_dump(),
            proposed_programming=proposed_dict,
            patient_deltas=patient_deltas
        )
        
        # Extract clean UI response and format as explanation list
        clean_response = agent_result.get("clean_ui_response", "")
        explanations = [clean_response] if clean_response else ["Model failed to generate explanations."]
        
    except Exception as e:
        explanations = [f"Model failed to generate explanations: {str(e)}"]
    
    return DbsTuningRecommendation(
        patient_id=patient_id,
        recommended_parameters=recommended_channels,
        explanations=explanations,
    )
