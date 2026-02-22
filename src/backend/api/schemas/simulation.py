from typing import List, Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class SimulationParameterTuple(BaseModel):
    amplitude_ma: float = Field(..., ge=0, le=10)
    frequency_hz: float = Field(..., ge=1, le=500)
    pulse_width_us: float = Field(..., ge=1, le=500)
    phase_deg: float = Field(..., ge=-180, le=180)

    model_config = ConfigDict(from_attributes=True)


class SimulationRequest(BaseModel):
    tuple_count: Literal[2, 4, 8, 16]
    parameter_tuples: List[SimulationParameterTuple] = Field(..., min_length=2, max_length=16)

    @model_validator(mode="after")
    def validate_tuple_count_match(self) -> "SimulationRequest":
        if len(self.parameter_tuples) != self.tuple_count:
            raise ValueError("parameter_tuples length must equal tuple_count")
        return self

    model_config = ConfigDict(from_attributes=True)


class SimulationChannelPoint(BaseModel):
    time_s: float = Field(..., ge=0)
    deviation: float

    model_config = ConfigDict(from_attributes=True)


class SimulationChannelTrace(BaseModel):
    channel_id: int = Field(..., ge=1, le=3)
    label: str
    points: List[SimulationChannelPoint]

    model_config = ConfigDict(from_attributes=True)


class SimulationResponse(BaseModel):
    status: str
    message: str
    sampling_hz: int = Field(..., ge=1)
    duration_s: float = Field(..., gt=0)
    channels: List[SimulationChannelTrace]

    model_config = ConfigDict(from_attributes=True)
