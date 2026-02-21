from datetime import date
from typing import List
from pydantic import BaseModel, Field, ConfigDict


class ChannelState(BaseModel):
    """DBS channel configuration and state."""
    channel_id: int = Field(..., gt=0)
    amplitude: float = Field(..., ge=0)
    voltage: float = Field(..., ge=0)
    frequency: float = Field(..., gt=0)
    time_on_hours: float = Field(..., ge=0)
    
    model_config = ConfigDict(from_attributes=True)


class DailyTremorPoint(BaseModel):
    """Daily average tremor activity data point."""
    date: date
    avg_tremor_activity: float = Field(..., ge=0, le=10)
    
    model_config = ConfigDict(from_attributes=True)


class DailyPromPoint(BaseModel):
    """Daily average PROM score data point."""
    date: date
    avg_prom_score: float = Field(..., ge=1, le=7)
    
    model_config = ConfigDict(from_attributes=True)


class DbsState(BaseModel):
    """Complete DBS state for a patient including channels and timeseries data."""
    patient_id: str
    channels: List[ChannelState]
    tremor_timeseries: List[DailyTremorPoint]
    prom_timeseries: List[DailyPromPoint]
    
    model_config = ConfigDict(from_attributes=True)
