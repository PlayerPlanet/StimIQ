from datetime import datetime
from pydantic import BaseModel, Field


class IMUAnalysisRequest(BaseModel):
    user_id: str = Field(..., description="Patient identifier")
    start_time: datetime = Field(..., description="ISO-8601 start timestamp")
    end_time: datetime = Field(..., description="ISO-8601 end timestamp")


class DataSegment(BaseModel):
    start_time: datetime = Field(..., description="Segment start timestamp")
    end_time: datetime = Field(..., description="Segment end timestamp")


class TimelineSegment(BaseModel):
    start_time: datetime = Field(..., description="Segment start timestamp")
    end_time: datetime = Field(..., description="Segment end timestamp")
    is_gap: bool = Field(..., description="True if this is a gap (no data), False if data present")


class TimeIntensityPoint(BaseModel):
    time: datetime = Field(..., description="Window center timestamp")
    intensity: float = Field(..., description="Tremor intensity (PSD AUC in tremor band)")


class SpectrumPoint(BaseModel):
    frequency: float = Field(..., description="Frequency in Hz")
    power: float = Field(..., description="Power spectral density")


class IMUAnalysisResponse(BaseModel):
    dominant_frequency: float = Field(..., description="Peak tremor frequency in Hz")
    tremor_intensity: float = Field(..., description="PSD AUC in tremor band")
    tremor_activity_share: float = Field(..., description="Percentage of time with tremor activity (intensity > threshold)")
    mild_tremor_share: float = Field(..., description="Percentage of tremor time classified as mild")
    medium_tremor_share: float = Field(..., description="Percentage of tremor time classified as medium")
    intense_tremor_share: float = Field(..., description="Percentage of tremor time classified as intense")
    average_event_duration_seconds: float = Field(..., description="Average duration of tremor events in seconds")
    total_datapoints: int = Field(..., description="Total number of samples used in analysis")
    data_segments: list[DataSegment] = Field(..., description="Continuous data segments")
    data_continuity_timeline: list[TimelineSegment] = Field(..., description="Timeline visualization of data and gaps")
    actual_start_time: datetime | None = Field(..., description="Actual first data point timestamp")
    actual_end_time: datetime | None = Field(..., description="Actual last data point timestamp")
    tremor_intensity_timeseries: list[TimeIntensityPoint] = Field(..., description="Tremor intensity over time")
    power_spectrum: list[SpectrumPoint] = Field(..., description="Aggregated power spectrum (0-20 Hz)")
