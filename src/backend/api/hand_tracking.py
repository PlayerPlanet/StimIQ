from uuid import UUID

from fastapi import APIRouter, HTTPException

from .schemas import (
    CreateSessionResponse,
    FingerTapRequest,
    FingerTapResult,
    LineFollowRequest,
    LineFollowResult,
    ProcessFingerTapSessionRequest,
    ProcessSessionRequest,
    ProcessSessionResponse,
)
from .services import (
    create_finger_tap_session,
    get_finger_tap_session_result,
    create_line_follow_session,
    process_finger_tap_session,
    get_line_follow_session_result,
    process_line_follow_session,
)


router = APIRouter(prefix="/v1/hand_tracking", tags=["hand_tracking"])


@router.post("/line_follow/sessions", response_model=CreateSessionResponse, status_code=201)
async def create_line_follow_tracking_session(payload: LineFollowRequest):
    session_id = create_line_follow_session(payload)
    return CreateSessionResponse(session_id=session_id, upload_url=None, status="created")


@router.post("/line_follow/sessions/{session_id}/process", response_model=ProcessSessionResponse)
async def process_line_follow_tracking_session(session_id: UUID, payload: ProcessSessionRequest):
    try:
        process_line_follow_session(session_id, payload.frames if payload.frames else None)
        return ProcessSessionResponse(session_id=session_id, status="processed")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/line_follow/sessions/{session_id}/result", response_model=LineFollowResult)
async def get_line_follow_tracking_result(session_id: UUID):
    try:
        return get_line_follow_session_result(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))


@router.post("/finger_tap/sessions", response_model=CreateSessionResponse, status_code=201)
async def create_finger_tap_tracking_session(payload: FingerTapRequest):
    session_id = create_finger_tap_session(payload)
    return CreateSessionResponse(session_id=session_id, upload_url=None, status="created")


@router.post("/finger_tap/sessions/{session_id}/process", response_model=ProcessSessionResponse)
async def process_finger_tap_tracking_session(session_id: UUID, payload: ProcessFingerTapSessionRequest):
    try:
        process_finger_tap_session(session_id, payload.frames if payload.frames else None)
        return ProcessSessionResponse(session_id=session_id, status="processed")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/finger_tap/sessions/{session_id}/result", response_model=FingerTapResult)
async def get_finger_tap_tracking_result(session_id: UUID):
    try:
        return get_finger_tap_session_result(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
