"""API endpoints for patient treatment goals management."""

from typing import Any, cast
from uuid import UUID
from fastapi import APIRouter, HTTPException, status

from database import get_supabase
from .schemas.treatment_goals import (
    TreatmentGoalsCreate,
    TreatmentGoalsResponse,
    TreatmentGoalsDetail,
)

router = APIRouter(prefix="/treatment-goals", tags=["treatment-goals"])


@router.get("/{patient_id}", response_model=TreatmentGoalsResponse)
async def get_patient_treatment_goals(patient_id: UUID):
    """Get current treatment goals for a patient."""
    supabase = get_supabase()
    
    try:
        # Check if patient exists
        patient_response = supabase.table("patients").select("id").eq("id", str(patient_id)).execute()
        if not patient_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {patient_id} not found"
            )
        
        # Get treatment goals
        goals_response = supabase.table("treatment_goals").select("*").eq("patient_id", str(patient_id)).execute()
        
        if not goals_response.data:
            # Return default goals if none exist
            return TreatmentGoalsResponse(
                id=patient_id,
                patient_id=patient_id,
                w_diag=0.55,
                w_nms=0.35,
                w_dur=0.10,
                notes=None,
            )
        
        data = cast(dict[str, Any], goals_response.data[0])
        return TreatmentGoalsResponse(
            id=UUID(data["id"]) if "id" in data else patient_id,
            patient_id=patient_id,
            w_diag=float(data.get("w_diag", 0.55)),
            w_nms=float(data.get("w_nms", 0.35)),
            w_dur=float(data.get("w_dur", 0.10)),
            notes=str(data["notes"]) if data.get("notes") else None,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.post("/{patient_id}", response_model=TreatmentGoalsResponse, status_code=status.HTTP_201_CREATED)
async def create_or_update_treatment_goals(
    patient_id: UUID,
    goals: TreatmentGoalsCreate
):
    """Create or update treatment goals for a patient."""
    supabase = get_supabase()
    
    try:
        # Check if patient exists
        patient_response = supabase.table("patients").select("id").eq("id", str(patient_id)).execute()
        if not patient_response.data:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Patient with ID {patient_id} not found"
            )
        
        goals_data = {
            "patient_id": str(patient_id),
            "w_diag": goals.w_diag,
            "w_nms": goals.w_nms,
            "w_dur": goals.w_dur,
            "notes": goals.notes,
        }
        
        # Check if goals already exist
        existing = supabase.table("treatment_goals").select("id").eq("patient_id", str(patient_id)).execute()
        
        if existing.data:
            # Update existing
            response = (
                supabase.table("treatment_goals")
                .update(goals_data)
                .eq("patient_id", str(patient_id))
                .execute()
            )
        else:
            # Create new
            response = supabase.table("treatment_goals").insert(goals_data).execute()
        
        if not response.data:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save treatment goals"
            )
        
        data = cast(dict[str, Any], response.data[0])
        return TreatmentGoalsResponse(
            id=UUID(data["id"]) if "id" in data else patient_id,
            patient_id=patient_id,
            w_diag=float(data.get("w_diag", goals.w_diag)),
            w_nms=float(data.get("w_nms", goals.w_nms)),
            w_dur=float(data.get("w_dur", goals.w_dur)),
            notes=str(data["notes"]) if data.get("notes") else None,
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )


@router.get("/{patient_id}/normalized", response_model=dict)
async def get_normalized_treatment_goals(patient_id: UUID):
    """Get treatment goals normalized to sum to 1.0."""
    supabase = get_supabase()
    
    try:
        goals_response = supabase.table("treatment_goals").select("*").eq("patient_id", str(patient_id)).execute()
        
        if not goals_response.data:
            # Return normalized default goals
            total = 0.55 + 0.35 + 0.10
            return {
                "w_diag": 0.55 / total,
                "w_nms": 0.35 / total,
                "w_dur": 0.10 / total,
            }
        
        goals = cast(dict[str, Any], goals_response.data[0])
        total = goals["w_diag"] + goals["w_nms"] + goals["w_dur"]
        if total < 1e-6:
            # Default equal weights
            return {"w_diag": 1/3, "w_nms": 1/3, "w_dur": 1/3}
        
        return {
            "w_diag": goals["w_diag"] / total,
            "w_nms": goals["w_nms"] / total,
            "w_dur": goals["w_dur"] / total,
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )
