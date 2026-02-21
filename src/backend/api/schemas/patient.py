from datetime import datetime, date
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class CreatePatientRequest(BaseModel):
    first_name: str = Field(..., min_length=1)
    last_name: str = Field(..., min_length=1)
    date_of_birth: Optional[date] = None
    notes: Optional[str] = None


class PatientResponse(BaseModel):
    id: UUID
    first_name: str
    last_name: str
    date_of_birth: Optional[date]
    notes: Optional[str]
    created_at: datetime


class PatientDetailResponse(PatientResponse):
    """Extended patient information for detail view"""
    # Contact Information
    email: Optional[str] = None
    phone: Optional[str] = None
    
    # Demographics
    gender: Optional[str] = None
    
    # DBS Treatment Information
    diagnosis_date: Optional[date] = None
    implant_date: Optional[date] = None
    device_model: Optional[str] = None
    device_serial: Optional[str] = None
    lead_location: Optional[str] = None
    
    # Clinical Team
    primary_physician: Optional[str] = None
    care_coordinator: Optional[str] = None
    
    # Treatment Status
    treatment_status: Optional[str] = None  # active, monitoring, adjustment_needed
    last_programming_date: Optional[date] = None
    next_appointment: Optional[date] = None
