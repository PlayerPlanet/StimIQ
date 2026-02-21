from datetime import datetime, date, timedelta
from typing import List
from ..schemas.dbs_state import ChannelState, DailyTremorPoint, DailyPromPoint, DbsState

# Note: This import is correct. We're in api/services/, so .. takes us to api/, then .schemas accesses the schemas subpackage


def _generate_mock_timeseries(days: int = 30) -> tuple[List[DailyTremorPoint], List[DailyPromPoint]]:
    """Generate mock timeseries data for the last N days."""
    tremor_points = []
    prom_points = []
    
    today = date.today()
    for i in range(days - 1, -1, -1):
        current_date = today - timedelta(days=i)
        
        # Generate tremor activity with some natural variation
        base_tremor = 5.0
        variation = (i % 7) * 0.3  # Daily pattern
        tremor_value = max(0, min(10, base_tremor + variation - (i % 3) * 0.5))
        
        # Generate PROM score with natural variation
        base_prom = 5.5
        prom_variation = ((i + 2) % 7) * 0.2
        prom_value = max(1, min(7, base_prom + prom_variation - (i % 4) * 0.3))
        
        tremor_points.append(DailyTremorPoint(date=current_date, avg_tremor_activity=round(tremor_value, 2)))
        prom_points.append(DailyPromPoint(date=current_date, avg_prom_score=round(prom_value, 2)))
    
    return tremor_points, prom_points


def get_dbs_state_for_patient(patient_id: str) -> DbsState:
    """
    Retrieve DBS state for a patient with mock data.
    
    Args:
        patient_id: The patient ID
        
    Returns:
        DbsState object with channel information and timeseries data
    """
    # Generate mock timeseries data
    tremor_series, prom_series = _generate_mock_timeseries()
    
    # Generate mock channel data (4 channels)
    channels = [
        ChannelState(
            channel_id=1,
            amplitude=2.5,
            voltage=4.2,
            frequency=130.0,
            time_on_hours=18.5,
        ),
        ChannelState(
            channel_id=2,
            amplitude=2.3,
            voltage=3.8,
            frequency=130.0,
            time_on_hours=18.5,
        ),
        ChannelState(
            channel_id=3,
            amplitude=2.7,
            voltage=4.5,
            frequency=130.0,
            time_on_hours=17.2,
        ),
        ChannelState(
            channel_id=4,
            amplitude=2.4,
            voltage=4.0,
            frequency=130.0,
            time_on_hours=18.5,
        ),
    ]
    
    return DbsState(
        patient_id=patient_id,
        channels=channels,
        tremor_timeseries=tremor_series,
        prom_timeseries=prom_series,
    )
