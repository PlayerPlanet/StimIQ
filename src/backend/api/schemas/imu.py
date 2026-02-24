from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field


class IMUUploadResponse(BaseModel):
    patient_id: str
    bucket: str
    file_path: str
    uploaded_at: datetime


class IMUSampleIn(BaseModel):
    """Single accelerometer sample from the client"""
    timestamp: int = Field(..., description="Timestamp in milliseconds since epoch")
    ax: float = Field(..., description="Acceleration X (m/s²)")
    ay: float = Field(..., description="Acceleration Y (m/s²)")
    az: float = Field(..., description="Acceleration Z (m/s²)")


class IMUBatchIn(BaseModel):
    """Batch of IMU samples from the frontend"""
    patient_id: str = Field(..., description="Demo patient ID (e.g., 'imu-demo-user')")
    device_id: str = Field(..., description="Device/browser session identifier")
    session_id: str = Field(..., description="Tracking session identifier")
    samples: List[IMUSampleIn] = Field(..., min_items=1, description="Array of accelerometer samples")
    meta: Optional[dict] = Field(default=None, description="Optional metadata (user_agent, sampling_hz, etc.)")


class IMUBatchResponse(BaseModel):
    """Response after batch insertion"""
    inserted: int = Field(..., description="Number of samples inserted")
    session_id: str = Field(..., description="Session ID for reference")
