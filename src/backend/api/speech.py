import os
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, File, Form, HTTPException, UploadFile

from database import get_supabase
from .schemas import SpeechEvaluationRequest, SpeechEvaluationResponse, SpeechUploadResponse
from .services import evaluate_speech_record
from .services.patient_identity import ensure_patient_exists


router = APIRouter(prefix="/v1/speech", tags=["speech"])


@router.post("/evaluate", response_model=SpeechEvaluationResponse)
async def evaluate_standardized_speech(payload: SpeechEvaluationRequest):
    return evaluate_speech_record(payload)


def _infer_extension(filename: str | None, mime_type: str | None) -> str:
    if filename:
        _, ext = os.path.splitext(filename)
        if ext:
            return ext.lower().lstrip(".")
    if mime_type == "audio/webm":
        return "webm"
    if mime_type == "audio/wav":
        return "wav"
    if mime_type == "audio/mpeg":
        return "mp3"
    if mime_type == "audio/mp4":
        return "mp4"
    return "bin"


@router.post("/recordings/upload", response_model=SpeechUploadResponse, status_code=201)
async def upload_speech_recording(
    file: UploadFile = File(...),
    step_type: Literal["SUSTAINED_VOWEL", "STANDARDIZED_SENTENCE", "RAPID_SYLLABLE_REPETITION"] = Form(...),
    session_id: UUID | None = Form(None),
    patient_id: UUID | None = Form(None),
    duration_ms: int | None = Form(None),
    transcript: str | None = Form(None),
):
    supabase = get_supabase()
    bucket_name = "speech-audio"

    if duration_ms is not None and duration_ms <= 0:
        raise HTTPException(status_code=400, detail="duration_ms must be > 0")

    file_content = await file.read()
    if not file_content:
        raise HTTPException(status_code=400, detail="Uploaded file is empty")

    resolved_patient_id = ensure_patient_exists(patient_id, source="speech_upload")
    resolved_session_id = session_id or uuid4()
    patient_segment = resolved_patient_id or "visitor"
    ext = _infer_extension(file.filename, file.content_type)
    storage_path = f"speech/{patient_segment}/{resolved_session_id}/{step_type}.{ext}"
    mime_type = file.content_type or "application/octet-stream"

    try:
        supabase.storage.from_(bucket_name).upload(
            path=storage_path,
            file=file_content,
            file_options={"content-type": mime_type, "upsert": "true"},
        )

        # Ensure one metadata row per (session_id, step_type) in case user re-records.
        supabase.table("speech_recordings").delete().eq("session_id", str(resolved_session_id)).eq(
            "step_type", step_type
        ).execute()

        insert_row = {
            "patient_id": resolved_patient_id,
            "session_id": str(resolved_session_id),
            "step_type": step_type,
            "storage_bucket": bucket_name,
            "storage_path": storage_path,
            "mime_type": mime_type,
            "duration_ms": duration_ms,
            "transcript": transcript,
        }
        response = supabase.table("speech_recordings").insert(insert_row).execute()
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create speech recording metadata")
        return response.data[0]
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Failed to upload speech recording: {exc}")
