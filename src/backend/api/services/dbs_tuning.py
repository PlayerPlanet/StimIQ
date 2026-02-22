from typing import List
from ..schemas.dbs_tuning import ChannelRecommendation, DbsTuningRecommendation


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
            amplitude=2.1,
            voltage=3.6,
            frequency=130.0,
            time_on_hours=17.5,
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
            amplitude=2.4,
            voltage=4.0,
            frequency=130.0,
            time_on_hours=18.5,
        ),
        ChannelRecommendation(
            channel_id=5,
            amplitude=2.2,
            voltage=3.9,
            frequency=125.0,
            time_on_hours=17.8,
        ),
        ChannelRecommendation(
            channel_id=6,
            amplitude=2.4,
            voltage=4.1,
            frequency=130.0,
            time_on_hours=17.6,
        ),
        ChannelRecommendation(
            channel_id=7,
            amplitude=3.1,
            voltage=4.9,
            frequency=130.0,
            time_on_hours=18.2,
        ),
        ChannelRecommendation(
            channel_id=8,
            amplitude=2.3,
            voltage=4.1,
            frequency=128.0,
            time_on_hours=18.9,
        ),
    ]
    
    explanations = [
        "During the last 30 days, the patient has reported fluctuations in mood while tremor activity shows an upward trend.",
        "Based on historical tuning records, a moderate increase in amplitude on channels 1 and 3 has shown potential to reduce tremor severity without compromising emotional stability.",
        "The recommended frequency adjustment on channel 3 may help optimize motor control during peak symptom periods.",
        "Increasing time-on hours across channels could improve overall symptom management throughout the day.",
    ]
    
    return DbsTuningRecommendation(
        patient_id=patient_id,
        recommended_parameters=recommended_channels,
        explanations=explanations,
    )
