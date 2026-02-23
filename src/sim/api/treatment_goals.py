"""Treatment goals specify how to weight different severity components for a patient.

This allows customization of the loss function based on patient preferences.
For example, some patients may prioritize symptomatic NMS reduction, while others
may focus on balancing diagnosis-related severity.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Optional


@dataclass(frozen=True)
class TreatmentGoals:
    """Weights for severity proxy components.
    
    Attributes:
        w_diag: Weight for diagnosis-based severity ([-1, 1] range where 1 = more severe)
        w_nms: Weight for NMS burden-based severity ([0, 1] range converted to [-1, 1])
        w_dur: Weight for disease duration-based severity (normalized to [-1, 1])
        patient_id: Optional reference to patient for traceability
        notes: Optional clinical notes or rationale for these weights
    """
    
    w_diag: float = 0.55
    w_nms: float = 0.35
    w_dur: float = 0.10
    patient_id: Optional[str] = None
    notes: Optional[str] = None

    def __post_init__(self) -> None:
        """Validate that weights are non-negative."""
        if self.w_diag < 0 or self.w_nms < 0 or self.w_dur < 0:
            raise ValueError("All weights must be non-negative")

    @property
    def total_weight(self) -> float:
        """Sum of all weights."""
        return self.w_diag + self.w_nms + self.w_dur

    @property
    def is_zero(self) -> bool:
        """Check if all weights are zero (edge case)."""
        return self.total_weight < 1e-6

    def normalize(self) -> TreatmentGoals:
        """Return a copy with weights normalized to sum to 1.0.
        
        If all weights are zero, returns equal weights (1/3 each).
        """
        total = self.total_weight
        if self.is_zero:
            # Default equal weights
            w_each = 1.0 / 3.0
            return TreatmentGoals(
                w_diag=w_each,
                w_nms=w_each,
                w_dur=w_each,
                patient_id=self.patient_id,
                notes=self.notes,
            )
        return TreatmentGoals(
            w_diag=self.w_diag / total,
            w_nms=self.w_nms / total,
            w_dur=self.w_dur / total,
            patient_id=self.patient_id,
            notes=self.notes,
        )

    @classmethod
    def from_dict(cls, d: dict) -> TreatmentGoals:
        """Create from dictionary, useful for config/serialization."""
        return cls(
            w_diag=d.get("w_diag", 0.55),
            w_nms=d.get("w_nms", 0.35),
            w_dur=d.get("w_dur", 0.10),
            patient_id=d.get("patient_id"),
            notes=d.get("notes"),
        )

    def to_dict(self) -> dict:
        """Serialize to dictionary."""
        return {
            "w_diag": self.w_diag,
            "w_nms": self.w_nms,
            "w_dur": self.w_dur,
            "patient_id": self.patient_id,
            "notes": self.notes,
        }

    @staticmethod
    def default() -> TreatmentGoals:
        """Return default balanced goals."""
        return TreatmentGoals()
