"""Treatment Goals API endpoints."""
from typing import Any, cast
from uuid import UUID
from fastapi import APIRouter, HTTPException

from database import get_supabase
from .schemas.treatment_goals import (
    TreatmentGoalsRequest,
    TreatmentGoalsResponse,
    TreatmentGoalsPreset,
    TREATMENT_GOAL_PRESETS,
)

router = APIRouter(prefix="/treatment-goals", tags=["treatment-goals"])


@router.get("/presets", response_model=list[TreatmentGoalsPreset])
async def get_treatment_goal_presets():
    """Get available treatment goal presets"""
    return TREATMENT_GOAL_PRESETS


@router.get("/{patient_id}", response_model=TreatmentGoalsResponse)
async def get_treatment_goals(patient_id: UUID):
    """Get treatment goals for a specific patient"""
    supabase = get_supabase()
    
    try:
        response = supabase.table("patients") \
            .select("id, created_at, updated_at, treatment_w_motor, treatment_w_non_motor, treatment_w_duration, treatment_non_motor_diary_ratio, treatment_goals_notes") \
            .eq("id", str(patient_id)) \
            .limit(1) \
            .execute()

        if not response.data:
            raise HTTPException(status_code=404, detail=f"Patient with ID {patient_id} not found")

        row = cast(dict[str, Any], response.data[0])
        default_preset = TREATMENT_GOAL_PRESETS[0]
        w_motor = row.get("treatment_w_motor")
        w_non_motor = row.get("treatment_w_non_motor")
        w_duration = row.get("treatment_w_duration")
        non_motor_diary_ratio = row.get("treatment_non_motor_diary_ratio")
        if w_motor is None or w_non_motor is None or w_duration is None:
            w_motor = default_preset.w_motor
            w_non_motor = default_preset.w_non_motor
            w_duration = default_preset.w_duration
        if non_motor_diary_ratio is None:
            non_motor_diary_ratio = default_preset.non_motor_diary_ratio
        return TreatmentGoalsResponse(
            id=row.get("id"),
            patient_id=str(patient_id),
            w_motor=w_motor,
            w_non_motor=w_non_motor,
            w_duration=w_duration,
            non_motor_diary_ratio=non_motor_diary_ratio,
            notes=row.get("treatment_goals_notes"),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )


@router.put("/{patient_id}", response_model=TreatmentGoalsResponse)
async def update_treatment_goals(
    patient_id: UUID,
    goals: TreatmentGoalsRequest
):
    """Update treatment goals for a specific patient"""
    supabase = get_supabase()
    
    try:
        goal_data = {
            "treatment_w_motor": goals.w_motor,
            "treatment_w_non_motor": goals.w_non_motor,
            "treatment_w_duration": goals.w_duration,
            "treatment_non_motor_diary_ratio": goals.non_motor_diary_ratio,
            "treatment_goals_notes": goals.notes,
        }

        update_response = supabase.table("patients") \
            .update(goal_data) \
            .eq("id", str(patient_id)) \
            .execute()

        if not update_response.data:
            raise HTTPException(
                status_code=500,
                detail="Failed to update treatment goals"
            )

        row = cast(dict[str, Any], update_response.data[0])
        return TreatmentGoalsResponse(
            id=row.get("id"),
            patient_id=str(patient_id),
            w_motor=row.get("treatment_w_motor"),
            w_non_motor=row.get("treatment_w_non_motor"),
            w_duration=row.get("treatment_w_duration"),
            non_motor_diary_ratio=row.get("treatment_non_motor_diary_ratio"),
            notes=row.get("treatment_goals_notes"),
            created_at=row.get("created_at"),
            updated_at=row.get("updated_at"),
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Database error: {str(e)}"
        )
