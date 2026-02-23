from datetime import date, datetime
from typing import Optional
from fastapi import APIRouter, HTTPException, Query
from uuid import uuid4

from database import get_supabase
from .schemas.prom import PromTestCreate, PromTestResponse
from .services.patient_identity import ensure_patient_exists


router = APIRouter(prefix="/prom_tests", tags=["prom_tests"])


@router.post("", response_model=PromTestResponse, status_code=201)
async def create_prom_test(prom_test: PromTestCreate):
    """Create a new PROM test entry"""
    supabase = get_supabase()

    prom_data = {
        "id": str(uuid4()),
        "patient_id": ensure_patient_exists(prom_test.patient_id, source="prom_tests"),
        "test_date": prom_test.test_date.isoformat(),
        "q1": prom_test.q1,
        "q2": prom_test.q2,
        "q3": prom_test.q3,
        "q4": prom_test.q4,
        "q5": prom_test.q5,
        "q6": prom_test.q6,
        "q7": prom_test.q7,
        "q8": prom_test.q8,
        "q9": prom_test.q9,
        "q10": prom_test.q10,
        "created_at": datetime.utcnow().isoformat(),
    }

    try:
        response = supabase.table("prom_tests").insert(prom_data).execute()

        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create PROM test")

        return PromTestResponse(**response.data[0])

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")


@router.get("", response_model=list[PromTestResponse])
async def get_prom_tests(
    patient_id: str = Query(..., min_length=1, max_length=64),
    date_from: Optional[date] = Query(None),
    date_to: Optional[date] = Query(None),
):
    """Get PROM tests for a patient with optional date range filtering"""
    supabase = get_supabase()

    try:
        query = supabase.table("prom_tests").select("*").eq("patient_id", patient_id)

        if date_from:
            query = query.gte("test_date", date_from.isoformat())

        if date_to:
            query = query.lte("test_date", date_to.isoformat())

        response = query.order("test_date", desc=True).execute()

        if not response.data:
            return []

        return [PromTestResponse(**prom) for prom in response.data]

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Database error: {str(e)}")
