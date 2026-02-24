"""Pydantic schemas for treatment goals API."""
from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field, model_validator


class TreatmentGoalsRequest(BaseModel):
    """Request schema for creating or updating treatment goals."""
    w_motor: float = Field(0.33, ge=0, le=1, description="Weight for IMU-derived motor severity")
    w_non_motor: float = Field(0.33, ge=0, le=1, description="Weight for combined diary + standard tests non-motor severity")
    w_duration: float = Field(0.34, ge=0, le=1, description="Weight for disease duration severity")
    w_speech: float = Field(0.0, ge=0, le=1, description="Weight for speech severity (placeholder)")
    non_motor_diary_ratio: float = Field(0.5, ge=0, le=1, description="Blend ratio for diary vs standard tests in non-motor score")
    notes: str | None = Field(None, description="Optional notes about treatment goals")

    @model_validator(mode="after")
    def validate_weights_sum(self) -> "TreatmentGoalsRequest":
        """Ensure weights sum to approximately 1.0."""
        total = self.w_motor + self.w_non_motor + self.w_duration + self.w_speech
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Weights must sum to 1.0, got {total:.6f}")
        return self


class TreatmentGoalsResponse(BaseModel):
    """Response schema for treatment goals."""
    id: str | None = Field(None, description="Patient ID")
    patient_id: str = Field(..., description="Associated patient ID")
    w_motor: float | None = Field(None, description="Weight for IMU-derived motor severity")
    w_non_motor: float | None = Field(None, description="Weight for combined diary + standard tests non-motor severity")
    w_duration: float | None = Field(None, description="Weight for disease duration severity")
    w_speech: float | None = Field(None, description="Weight for speech severity (placeholder)")
    non_motor_diary_ratio: float | None = Field(None, description="Blend ratio for diary vs standard tests in non-motor score")
    notes: str | None = Field(None, description="Optional notes about treatment goals")
    created_at: str | None = Field(None, description="Creation timestamp")
    updated_at: str | None = Field(None, description="Last update timestamp")

    model_config = ConfigDict(from_attributes=True)


class TreatmentGoalsPreset(BaseModel):
    """Predefined treatment goal presets."""
    name: str = Field(..., description="Preset name")
    description: str = Field(..., description="Preset description")
    w_motor: float = Field(..., ge=0, le=1)
    w_non_motor: float = Field(..., ge=0, le=1)
    w_duration: float = Field(..., ge=0, le=1)
    w_speech: float = Field(0.0, ge=0, le=1)
    non_motor_diary_ratio: float = Field(0.5, ge=0, le=1)
    
    model_config = ConfigDict(from_attributes=True)


# Predefined presets that match TreatmentGoals class methods
TREATMENT_GOAL_PRESETS: list[TreatmentGoalsPreset] = [
    TreatmentGoalsPreset(
        name="default",
        description="Balanced approach to all severity components",
        w_motor=0.33,
        w_non_motor=0.33,
        w_duration=0.34,
        w_speech=0.0,
        non_motor_diary_ratio=0.5,
    ),
    TreatmentGoalsPreset(
        name="motor_focused",
        description="Prioritize motor symptoms and diagnostic improvement",
        w_motor=0.55,
        w_non_motor=0.35,
        w_duration=0.10,
        w_speech=0.0,
        non_motor_diary_ratio=0.5,
    ),
    TreatmentGoalsPreset(
        name="quality_of_life_focused",
        description="Prioritize non-motor symptoms and quality of life",
        w_motor=0.20,
        w_non_motor=0.70,
        w_duration=0.10,
        w_speech=0.0,
        non_motor_diary_ratio=0.65,
    ),
]
