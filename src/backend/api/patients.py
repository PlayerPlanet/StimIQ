from uuid import UUID
from fastapi import APIRouter, HTTPException, Query

from database import get_supabase
from .schemas import CreatePatientRequest, PatientResponse, PatientDetailResponse
from .schemas import PatientAnalysisRequest, PatientAnalysisResponse
from .services.patient_identity import is_auto_provisioned_visitor_patient
from .services import generate_patient_analysis


router = APIRouter(prefix="/patients", tags=["patients"])


@router.get("", response_model=list[PatientResponse])
async def list_patients(include_visitors: bool = Query(False)):
    """List all patients"""
    supabase = get_supabase()
    
    try:
        response = supabase.table("patients").select("*").execute()
        
        if not response.data:
            return []

        patient_rows = response.data
        if not include_visitors:
            patient_rows = [row for row in patient_rows if not is_auto_provisioned_visitor_patient(row)]

        return [PatientResponse(**patient) for patient in patient_rows]
        
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


@router.get("/{patient_id}", response_model=PatientDetailResponse)
async def get_patient(patient_id: UUID):
    """Get detailed patient information including DBS treatment data"""
    supabase = get_supabase()
    
    try:
        response = supabase.table("patients").select("*").eq("id", str(patient_id)).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found")
        
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
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.post("/analysis-report", response_model=PatientAnalysisResponse)
async def generate_analysis_report(payload: PatientAnalysisRequest):
    """Generate an AI analysis report of patient PROM data using the DBS agent."""
    try:
        prom_dicts = [entry.model_dump() for entry in payload.prom_data]
        analysis_text = generate_patient_analysis(
            patient_id=payload.patient_id,
            prom_data=prom_dicts,
            patient_name=payload.patient_name,
        )
        return PatientAnalysisResponse(status="ok", analysis_text=analysis_text)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate analysis: {str(e)}")
