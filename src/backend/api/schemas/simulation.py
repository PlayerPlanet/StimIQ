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


class OptimizationStepRequest(BaseModel):
    tuple_count: Literal[2, 4, 8, 16]
    current_parameter_tuples: List["OptimizationInputParameterTuple"] = Field(..., min_length=2, max_length=16)
    include_simulation: bool = True

    @model_validator(mode="after")
    def validate_tuple_count_match(self) -> "OptimizationStepRequest":
        if len(self.current_parameter_tuples) != self.tuple_count:
            raise ValueError("current_parameter_tuples length must equal tuple_count")
        return self

    model_config = ConfigDict(from_attributes=True)


class OptimizationInputParameterTuple(BaseModel):
    amplitude_ma: float = Field(..., ge=0, le=10)
    frequency_hz: float = Field(..., ge=1, le=500)
    # Intentionally wider than SimulationParameterTuple to accept legacy-scaled values
    # (e.g. 60000 that should be interpreted as 60 us).
    pulse_width_us: float = Field(..., ge=1, le=1_000_000)
    phase_deg: float = Field(..., ge=-180, le=180)

    model_config = ConfigDict(from_attributes=True)


class OptimizationStepResponse(BaseModel):
    status: str
    message: str
    step_severity: float = Field(..., ge=0)
    next_parameter_tuples: List[SimulationParameterTuple]
    simulation: SimulationResponse | None = None

    model_config = ConfigDict(from_attributes=True)
