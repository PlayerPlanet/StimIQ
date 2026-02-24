"""Patient-specific treatment goals for severity loss customization."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TreatmentGoals:
    """Patient-specific weights for severity proxy components.
    
    These weights define the relative importance of:
    - w_motor: IMU-derived motor severity
    - w_non_motor: Combined diary + standard tests non-motor severity
    - w_duration: Disease duration severity
    - w_speech: Speech severity (placeholder until speech metrics are integrated)
    
    Weights should sum to 1.0 for interpretability.
    """
    w_motor: float = 0.33
    w_non_motor: float = 0.33
    w_duration: float = 0.34
    w_speech: float = 0.0
    non_motor_diary_ratio: float = 0.5
    patient_id: str | None = None
    notes: str | None = None
    
    def __post_init__(self) -> None:
        total = self.w_motor + self.w_non_motor + self.w_duration + self.w_speech
        if abs(total - 1.0) > 1e-6:
            raise ValueError(
                f"Treatment goal weights must sum to 1.0, got {total:.6f}"
            )
        if any(w < 0 for w in [self.w_motor, self.w_non_motor, self.w_duration, self.w_speech]):
            raise ValueError("All weights must be non-negative")
        if not (0.0 <= self.non_motor_diary_ratio <= 1.0):
            raise ValueError("non_motor_diary_ratio must be between 0 and 1")
    
    @classmethod
    def default(cls) -> TreatmentGoals:
        """Return balanced default goals."""
        return cls(w_motor=0.33, w_non_motor=0.33, w_duration=0.34, w_speech=0.0, non_motor_diary_ratio=0.5)
    
    @classmethod
    def motor_focused(cls) -> TreatmentGoals:
        """Prioritize motor symptoms."""
        return cls(w_motor=0.55, w_non_motor=0.35, w_duration=0.10, w_speech=0.0, non_motor_diary_ratio=0.5)
    
    @classmethod
    def quality_of_life_focused(cls) -> TreatmentGoals:
        """Prioritize non-motor symptoms."""
        return cls(w_motor=0.20, w_non_motor=0.70, w_duration=0.10, w_speech=0.0, non_motor_diary_ratio=0.65)
    
    def normalize(self) -> TreatmentGoals:
        """Return a normalized copy with weights summing to 1.0."""
        total = self.w_motor + self.w_non_motor + self.w_duration + self.w_speech
        if total < 1e-9:
            return TreatmentGoals.default()
        return TreatmentGoals(
            w_motor=self.w_motor / total,
            w_non_motor=self.w_non_motor / total,
            w_duration=self.w_duration / total,
            w_speech=self.w_speech / total,
            non_motor_diary_ratio=self.non_motor_diary_ratio,
            patient_id=self.patient_id,
            notes=self.notes,
        )
