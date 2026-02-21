from fastapi import APIRouter, HTTPException

from .schemas import DbsState, DbsTuningRecommendation
from .services import get_dbs_state_for_patient, get_dbs_tuning_recommendation


router = APIRouter(prefix="/clinician", tags=["clinician"])


@router.get("/dbs_state/{patient_id}", response_model=DbsState)
async def get_dbs_state(patient_id: str):
    """Get DBS state for a patient including channel configuration and timeseries data."""
    try:
        dbs_state = get_dbs_state_for_patient(patient_id)
        return dbs_state
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve DBS state: {str(e)}")


@router.get("/dbs_tuning/{patient_id}", response_model=DbsTuningRecommendation)
async def get_dbs_tuning(patient_id: str):
    """Get DBS tuning recommendations for a patient."""
    try:
        recommendation = get_dbs_tuning_recommendation(patient_id)
        return recommendation
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve DBS tuning recommendation: {str(e)}")
