from uuid import UUID

from fastapi import APIRouter, HTTPException

from .schemas import (
    CreateSessionResponse,
    LineFollowRequest,
    LineFollowResult,
    ProcessSessionRequest,
    ProcessSessionResponse,
)
from .services import (
    create_line_follow_session,
    get_line_follow_session_result,
    process_line_follow_session,
)


router = APIRouter(prefix="/v1/hand_tracking/line_follow", tags=["hand_tracking"])


@router.post("/sessions", response_model=CreateSessionResponse, status_code=201)
async def create_session(payload: LineFollowRequest):
    session_id = create_line_follow_session(payload)
    return CreateSessionResponse(session_id=session_id, upload_url=None, status="created")


@router.post("/sessions/{session_id}/process", response_model=ProcessSessionResponse)
async def process_session(session_id: UUID, payload: ProcessSessionRequest):
    try:
        process_line_follow_session(session_id, payload.frames if payload.frames else None)
        return ProcessSessionResponse(session_id=session_id, status="processed")
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.get("/sessions/{session_id}/result", response_model=LineFollowResult)
async def get_result(session_id: UUID):
    try:
        return get_line_follow_session_result(session_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc))
    except RuntimeError as exc:
        raise HTTPException(status_code=409, detail=str(exc))
