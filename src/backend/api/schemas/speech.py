from typing import Literal
from uuid import UUID

from pydantic import BaseModel, Field, model_validator


class SpeechStepRecord(BaseModel):
    step_type: Literal["SUSTAINED_VOWEL", "STANDARDIZED_SENTENCE", "RAPID_SYLLABLE_REPETITION"]
    duration_ms: int | None = Field(default=None, gt=0, le=120000)
    audio_ref: str | None = Field(default=None, max_length=512)
    transcript: str | None = Field(default=None, max_length=5000)


class SpeechEvaluationRequest(BaseModel):
    test_type: Literal["STANDARDIZED_SPEECH"] = "STANDARDIZED_SPEECH"
    protocol_version: Literal["v1"] = "v1"
    patient_id: UUID | None = None
    session_id: UUID | None = None
    steps: list[SpeechStepRecord] = Field(..., min_length=3, max_length=3)

    @model_validator(mode="after")
    def validate_required_steps(self) -> "SpeechEvaluationRequest":
        expected_steps = {
            "SUSTAINED_VOWEL",
            "STANDARDIZED_SENTENCE",
            "RAPID_SYLLABLE_REPETITION",
        }
        actual_steps = {step.step_type for step in self.steps}
        if actual_steps != expected_steps:
            raise ValueError(
                "steps must include exactly one of each: "
                "SUSTAINED_VOWEL, STANDARDIZED_SENTENCE, RAPID_SYLLABLE_REPETITION"
            )
        return self


class SpeechEvaluationResponse(BaseModel):
    loss: float | None = None
    msg: str = Field(..., max_length=300)


class SpeechUploadResponse(BaseModel):
    id: UUID
    patient_id: UUID | None = None
    session_id: UUID | None = None
    step_type: Literal["SUSTAINED_VOWEL", "STANDARDIZED_SENTENCE", "RAPID_SYLLABLE_REPETITION"]
    storage_bucket: str
    storage_path: str
    mime_type: str
    duration_ms: int | None = None
    transcript: str | None = None
