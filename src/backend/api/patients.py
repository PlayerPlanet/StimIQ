from uuid import UUID
from fastapi import APIRouter, HTTPException

from database import get_supabase
from .schemas import CreatePatientRequest, PatientResponse


router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientResponse])
async def list_patients():
    """List all patients"""
    supabase = get_supabase()
    
    try:
        response = supabase.table("patients").select("*").execute()
        
        if not response.data:
            return []
        
        return [PatientResponse(**patient) for patient in response.data]
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("", response_model=PatientResponse, status_code=201)
async def create_patient(patient: CreatePatientRequest):
    supabase = get_supabase()
    
    patient_data = {
        "first_name": patient.first_name,
        "last_name": patient.last_name,
        "date_of_birth": patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        "notes": patient.notes,
    }
    
    try:
        response = supabase.table("patients").insert(patient_data).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create patient")
        
        return PatientResponse(**response.data[0])
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: UUID):
    supabase = get_supabase()
    
    try:
        response = supabase.table("patients").select("*").eq("id", str(patient_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found")
        
        return PatientResponse(**response.data[0])
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
