from __future__ import annotations

from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field, model_validator


class Point2D(BaseModel):
    x: float = Field(..., ge=0.0, le=1.0)
    y: float = Field(..., ge=0.0, le=1.0)


class WristFrameInput(BaseModel):
    t_ms: int = Field(..., ge=0)
    wrist_raw: Point2D | None = None
    conf: float | None = Field(default=None, ge=0.0, le=1.0)
    inferred_hand: Literal["LEFT", "RIGHT", "UNKNOWN"] | None = None


class LineFollowRequest(BaseModel):
    test_type: Literal["LINE_FOLLOW"] = "LINE_FOLLOW"
    protocol_version: Literal["v1"] = "v1"
    patient_id: UUID | None = None
    p1: Point2D
    p2: Point2D
    end_radius: float = Field(default=0.03, gt=0.0, le=0.5)
    corridor_radius: float = Field(default=0.02, gt=0.0, le=0.5)
    max_duration_ms: int = Field(default=15000, gt=0, le=120000)
    video_ref: str | None = Field(default=None, max_length=512)
    handedness_expected: str | None = Field(default=None, max_length=16)
    camera_orientation: str | None = Field(default=None, max_length=64)
    frames: list[WristFrameInput] = Field(default_factory=list, max_length=5000)

    @model_validator(mode="after")
    def validate_line_endpoints(self) -> "LineFollowRequest":
        if self.p1.x == self.p2.x and self.p1.y == self.p2.y:
            raise ValueError("p1 and p2 must be different points")
        return self


class CreateSessionResponse(BaseModel):
    session_id: UUID
    upload_url: str | None = None
    status: Literal["created", "processed"] = "created"


class ProcessSessionRequest(BaseModel):
    frames: list[WristFrameInput] = Field(default_factory=list, max_length=5000)


class ProcessSessionResponse(BaseModel):
    session_id: UUID
    status: Literal["processed"]


class WristFrameResult(BaseModel):
    t_ms: int
    wrist_raw: Point2D | None = None
    wrist_smooth: Point2D | None = None
    conf: float = Field(..., ge=0.0, le=1.0)


class LineFollowQuality(BaseModel):
    visible_fraction: float = Field(..., ge=0.0, le=1.0)
    out_of_frame_fraction: float = Field(..., ge=0.0, le=1.0)
    redo_recommended: bool
    redo_instructions: list[str] = Field(default_factory=list, max_length=20)


class LineFollowMetrics(BaseModel):
    D_end: float | None = None
    time_to_complete_ms: int | None = None
    completed: bool
    path_length: float = 0.0
    line_length: float = 0.0
    straightness_ratio: float = 0.0
    mean_perp_dev: float = 0.0
    max_perp_dev: float = 0.0
    jerk_rms: float | None = None


class LineFollowResult(BaseModel):
    session_id: UUID
    tracking_version: str = "landmark0-v1"
    frames: list[WristFrameResult] = Field(default_factory=list, max_length=5000)
    quality: LineFollowQuality
    metrics: LineFollowMetrics
    artifacts: dict[str, str] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class FingerTapFrameInput(BaseModel):
    t_ms: int = Field(..., ge=0)
    thumb_tip: Point2D | None = None
    index_tip: Point2D | None = None
    wrist: Point2D | None = None
    middle_mcp: Point2D | None = None
    conf: float | None = Field(default=None, ge=0.0, le=1.0)
    inferred_hand: Literal["LEFT", "RIGHT", "UNKNOWN"] | None = None


class FingerTapRequest(BaseModel):
    test_type: Literal["FINGER_TAP"] = "FINGER_TAP"
    protocol_version: Literal["v1"] = "v1"
    patient_id: UUID | None = None
    max_duration_ms: int = Field(default=15000, gt=0, le=120000)
    video_ref: str | None = Field(default=None, max_length=512)
    handedness_expected: str | None = Field(default=None, max_length=16)
    camera_orientation: str | None = Field(default=None, max_length=64)
    frames: list[FingerTapFrameInput] = Field(default_factory=list, max_length=5000)


class ProcessFingerTapSessionRequest(BaseModel):
    frames: list[FingerTapFrameInput] = Field(default_factory=list, max_length=5000)


class FingerTapFrameResult(BaseModel):
    t_ms: int
    conf: float = Field(..., ge=0.0, le=1.0)
    d_norm_raw: float | None = None
    d_norm_smooth: float | None = None


class FingerTapQuality(BaseModel):
    visible_fraction: float = Field(..., ge=0.0, le=1.0)
    redo_recommended: bool
    redo_instructions: list[str] = Field(default_factory=list, max_length=20)


class FingerTapMetrics(BaseModel):
    tap_count: int = Field(default=0, ge=0)
    cadence_hz: float | None = None
    cv_iti: float | None = None
    mean_amp: float | None = None
    cv_amp: float | None = None
    decrement_amp_slope: float | None = None
    pause_count: int | None = None
    max_gap_s: float | None = None


class FingerTapResult(BaseModel):
    session_id: UUID
    tracking_version: str = "finger-tap-landmark-v1"
    frames: list[FingerTapFrameResult] = Field(default_factory=list, max_length=5000)
    tap_indices: list[int] = Field(default_factory=list, max_length=1000)
    tap_times_s: list[float] = Field(default_factory=list, max_length=1000)
    quality: FingerTapQuality
    metrics: FingerTapMetrics
    artifacts: dict[str, str] = Field(default_factory=dict)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
