from api.schemas import SpeechEvaluationRequest, SpeechEvaluationResponse


def evaluate_speech_record(_: SpeechEvaluationRequest) -> SpeechEvaluationResponse:
    return SpeechEvaluationResponse(
        loss=None,
        msg="loss not implemented yet",
    )
