from uuid import UUID
from fastapi import APIRouter, HTTPException

from database import get_supabase
<<<<<<< HEAD
from .schemas import CreatePatientRequest, PatientResponse
=======
from .schemas import CreatePatientRequest, PatientResponse, PatientDetailResponse
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df


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


<<<<<<< HEAD
@router.get("/{patient_id}", response_model=PatientResponse)
async def get_patient(patient_id: UUID):
=======
@router.get("/{patient_id}", response_model=PatientDetailResponse)
async def get_patient(patient_id: UUID):
    """Get detailed patient information including DBS treatment data"""
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
    supabase = get_supabase()
    
    try:
        response = supabase.table("patients").select("*").eq("id", str(patient_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found")
        
<<<<<<< HEAD
        return PatientResponse(**response.data[0])
=======
        patient_data = response.data[0]
        
        # For MVP, add mock DBS data if not present
        # In production, this would come from proper database tables
        if not patient_data.get("device_model"):
            patient_data.update({
                "email": f"{patient_data.get('first_name', 'patient').lower()}.{patient_data.get('last_name', 'email').lower()}@gmail.com",
                "phone": "+1 (555) 123-4567",
                "gender": "Not specified",
                "diagnosis_date": "2023-03-15",
                "implant_date": "2023-09-10",
                "device_model": "Medtronic Percept PC",
                "device_serial": "SN-" + str(patient_id)[:8].upper(),
                "lead_location": "Bilateral STN",
                "primary_physician": "Dr. Sarah Chen",
                "care_coordinator": "Jennifer Martinez, RN",
                "treatment_status": "active",
                "last_programming_date": "2026-01-15",
                "next_appointment": "2026-03-01",
            })
        
        return PatientDetailResponse(**patient_data)
>>>>>>> 19bb16b0c0df269fd02b6ae68b82e702e3c894df
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
