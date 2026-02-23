from fastapi import APIRouter

from .schemas import SpeechEvaluationRequest, SpeechEvaluationResponse
from .services import evaluate_speech_record


router = APIRouter(prefix="/v1/speech", tags=["speech"])


@router.post("/evaluate", response_model=SpeechEvaluationResponse)
async def evaluate_standardized_speech(payload: SpeechEvaluationRequest):
    return evaluate_speech_record(payload)
