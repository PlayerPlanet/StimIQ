from typing import List
from pydantic import BaseModel, Field, ConfigDict, field_validator
from .simulation import SimulationResponse


class ChannelRecommendation(BaseModel):
    """DBS channel recommendation with suggested parameter adjustments."""
    channel_id: int = Field(..., gt=0)
    amplitude: float = Field(..., ge=0)
    frequency: float = Field(..., gt=0)
    pulse_width_s: float = Field(..., ge=0)
    phase_rad: float = Field(..., ge=0)
    
    model_config = ConfigDict(from_attributes=True)


class DbsTuningRecommendation(BaseModel):
    """Complete DBS tuning recommendation with parameters and explanations."""
    patient_id: str = Field(..., min_length=1, max_length=64)
    recommended_parameters: List[ChannelRecommendation] = Field(default_factory=list, max_length=16)
    explanations: List[str] = Field(default_factory=list, max_length=64)
    simulated_data: SimulationResponse | None = None
    
    @field_validator("explanations")
    @classmethod
    def validate_explanations(cls, v: List[str]) -> List[str]:
        if any(len(item) > 500 for item in v):
            raise ValueError("Each explanation must be 500 characters or fewer")
        return v

    model_config = ConfigDict(from_attributes=True)
