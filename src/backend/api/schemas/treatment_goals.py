"""Schemas for patient treatment goals."""

from typing import Optional
from uuid import UUID
from pydantic import BaseModel, Field


class TreatmentGoalsCreate(BaseModel):
    """Request to create/update treatment goals for a patient."""
    
    patient_id: UUID
    w_diag: float = Field(0.55, ge=0.0, description="Weight for diagnosis component")
    w_nms: float = Field(0.35, ge=0.0, description="Weight for NMS component")
    w_dur: float = Field(0.10, ge=0.0, description="Weight for duration component")
    notes: Optional[str] = None


class TreatmentGoalsResponse(BaseModel):
    """Response with treatment goals for a patient."""
    
    id: UUID
    patient_id: UUID
    w_diag: float
    w_nms: float
    w_dur: float
    notes: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    
    class Config:
        from_attributes = True


class TreatmentGoalsDetail(TreatmentGoalsResponse):
    """Extended treatment goals with computed fields."""
    
    @property
    def total_weight(self) -> float:
        """Sum of all weights."""
        return self.w_diag + self.w_nms + self.w_dur
    
    @property
    def normalized_weights(self) -> dict[str, float]:
        """Return normalized weights that sum to 1.0."""
        total = self.total_weight
        if total < 1e-6:
            # Default equal weights
            return {"w_diag": 1/3, "w_nms": 1/3, "w_dur": 1/3}
        return {
            "w_diag": self.w_diag / total,
            "w_nms": self.w_nms / total,
            "w_dur": self.w_dur / total,
        }
