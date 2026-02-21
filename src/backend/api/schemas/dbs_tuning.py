from typing import List
from pydantic import BaseModel, Field, ConfigDict


class ChannelRecommendation(BaseModel):
    """DBS channel recommendation with suggested parameter adjustments."""
    channel_id: int = Field(..., gt=0)
    amplitude: float = Field(..., ge=0)
    voltage: float = Field(..., ge=0)
    frequency: float = Field(..., gt=0)
    time_on_hours: float = Field(..., ge=0)
    
    model_config = ConfigDict(from_attributes=True)


class DbsTuningRecommendation(BaseModel):
    """Complete DBS tuning recommendation with parameters and explanations."""
    patient_id: str
    recommended_parameters: List[ChannelRecommendation]
    explanations: List[str]
    
    model_config = ConfigDict(from_attributes=True)
