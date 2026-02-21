from datetime import date, datetime
from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field, ConfigDict


class PromTestBase(BaseModel):
    patient_id: str = Field(..., min_length=1)
    test_date: date
    q1: int = Field(..., ge=1, le=7)
    q2: int = Field(..., ge=1, le=7)
    q3: int = Field(..., ge=1, le=7)
    q4: int = Field(..., ge=1, le=7)
    q5: int = Field(..., ge=1, le=7)
    q6: int = Field(..., ge=1, le=7)
    q7: int = Field(..., ge=1, le=7)
    q8: int = Field(..., ge=1, le=7)
    q9: int = Field(..., ge=1, le=7)
    q10: int = Field(..., ge=1, le=7)


class PromTestCreate(PromTestBase):
    pass


class PromTestResponse(PromTestBase):
    id: UUID
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
