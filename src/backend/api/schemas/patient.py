from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class CreatePatientRequest(BaseModel):
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: Optional[date] = None
    notes: Optional[str] = Field(default=None, max_length=2000)
    treatment_w_motor: Optional[float] = None
    treatment_w_non_motor: Optional[float] = None
    treatment_w_duration: Optional[float] = None
    treatment_w_speech: Optional[float] = None
    treatment_non_motor_diary_ratio: Optional[float] = Field(default=None, ge=0.0, le=1.0)
    treatment_goals_notes: Optional[str] = Field(default=None, max_length=2000)


class PatientResponse(BaseModel):
    id: UUID
    first_name: str = Field(..., min_length=1, max_length=100)
    last_name: str = Field(..., min_length=1, max_length=100)
    date_of_birth: Optional[date]
    notes: Optional[str] = Field(default=None, max_length=2000)
    created_at: datetime

class PatientDetailResponse(PatientResponse):
    """Extended patient information for detail view"""
    # Contact Information
    email: Optional[str] = Field(default=None, max_length=254)
    phone: Optional[str] = Field(default=None, max_length=32)
    
    # Demographics
    gender: Optional[str] = Field(default=None, max_length=32)
    
    # DBS Treatment Information
    diagnosis_date: Optional[date] = None
    implant_date: Optional[date] = None
    device_model: Optional[str] = Field(default=None, max_length=120)
    device_serial: Optional[str] = Field(default=None, max_length=120)
    lead_location: Optional[str] = Field(default=None, max_length=120)
    
    # Clinical Team
    primary_physician: Optional[str] = Field(default=None, max_length=120)
    care_coordinator: Optional[str] = Field(default=None, max_length=120)
    
    # Treatment Status
    treatment_status: Optional[str] = Field(default=None, max_length=64)  # active, monitoring, adjustment_needed
    last_programming_date: Optional[date] = None
    next_appointment: Optional[date] = None
